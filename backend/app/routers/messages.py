from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..middleware.rbac import get_current_user
from ..models import Message, MessageStatus, User, Barangay
import os
from pathlib import Path

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads/messages")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _msg_out(m: Message) -> dict:
    sender = m.sender.username if m.sender else "Unknown"
    recipient = m.recipient.username if m.recipient else m.recipient_role.replace("_", " ")
    return {
        "id": str(m.id),
        "subject": m.subject,
        "content": m.content,
        "sender": sender,
        "sender_role": m.sender.role.value if m.sender else "admin",
        "recipient": recipient,
        "recipient_role": m.recipient_role,
        "timestamp": m.created_at.isoformat() if m.created_at else "",
        "status": m.status.value if hasattr(m.status, "value") else "sent",
        "has_attachment": m.has_attachment,
        "is_urgent": m.is_urgent,
        "attachment_filename": m.attachment_filename or None,
        "parent_message_id": str(m.parent_message_id) if m.parent_message_id else None,
    }


@router.get("/inbox")
async def inbox(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        # Load messages where user is recipient (either by ID or by role)
        if user.role.value == "super_admin":
            # Super admins receive messages sent to "super_admin" role or to their specific ID
            stmt = select(Message).where(
                or_(
                    Message.recipient_role == "super_admin",
                    Message.recipient_id == user.id
                )
            ).order_by(Message.created_at.desc()).limit(100)
        else:
            # Other admins receive messages sent to their specific ID or to "admin" role
            stmt = select(Message).where(
                or_(
                    Message.recipient_id == user.id,
                    Message.recipient_role == user.role.value
                )
            ).order_by(Message.created_at.desc()).limit(100)
        
        # Eagerly load relationships to avoid N+1 queries
        stmt = stmt.options(selectinload(Message.sender), selectinload(Message.recipient))
        
        rows = list((await db.scalars(stmt)).all())
        return [_msg_out(r) for r in rows]
    except Exception as e:
        print(f"Error fetching inbox: {e}")
        import traceback
        traceback.print_exc()
        return []


@router.get("/sent")
async def sent_messages(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        stmt = select(Message).where(Message.sender_id == user.id).order_by(Message.created_at.desc()).limit(100)
        # Eagerly load relationships to avoid N+1 queries
        stmt = stmt.options(selectinload(Message.sender), selectinload(Message.recipient))
        rows = list((await db.scalars(stmt)).all())
        return [_msg_out(r) for r in rows]
    except Exception as e:
        print(f"Error fetching sent messages: {e}")
        import traceback
        traceback.print_exc()
        return []


class MessageIn(BaseModel):
    recipient: str
    subject: str
    content: str
    is_urgent: bool = False


@router.post("")
async def send_message(
    recipient: str = Form(...),
    subject: str = Form(...),
    content: str = Form(...),
    is_urgent: bool = Form(default=False),
    parent_message_id: str = Form(default=None),
    file: UploadFile = File(default=None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        # Handle file upload
        has_attachment = False
        attachment_filename = None
        if file is not None and file.filename is not None:
            has_attachment = True
            # Save file to disk
            file_content = await file.read()
            filename = f"{user.id}_{file.filename}"
            filepath = UPLOAD_DIR / filename
            with open(filepath, "wb") as f:
                f.write(file_content)
            attachment_filename = filename
        
        # Convert parent_message_id string to UUID
        parent_id = None
        if parent_message_id:
            try:
                parent_id = UUID(parent_message_id)
            except ValueError:
                pass
        
        # Handle different recipient types
        if recipient == "super_admin":
            # Send to all super admins AND all barangays (broadcast)
            # Get all super admins
            super_admins = (await db.scalars(
                select(User).where(User.role == "super_admin")
            )).all()
            
            # Get all barangays
            barangays = (await db.scalars(
                select(Barangay)
            )).all()
            
            # Create messages for each super admin
            for sa in super_admins:
                msg = Message(
                    sender_id=user.id,
                    recipient_id=sa.id,
                    recipient_role="super_admin",
                    subject=subject,
                    content=content,
                    is_urgent=is_urgent,
                    has_attachment=has_attachment,
                    attachment_filename=attachment_filename,
                    parent_message_id=parent_id,
                )
                db.add(msg)
            
            # Create messages for each barangay
            for brgy in barangays:
                msg = Message(
                    sender_id=user.id,
                    recipient_id=brgy.id,
                    recipient_role="barangay",
                    subject=subject,
                    content=content,
                    is_urgent=is_urgent,
                    has_attachment=has_attachment,
                    attachment_filename=attachment_filename,
                    parent_message_id=parent_id,
                )
                db.add(msg)
            
            await db.commit()
            
            return {
                "id": "broadcast",
                "status": "sent",
                "message": f"Broadcast message sent to {len(super_admins)} super admins and {len(barangays)} barangays",
                "recipients_count": len(super_admins) + len(barangays),
            }
        
        elif recipient.startswith("barangay_"):
            # Send to specific barangay
            barangay_id = recipient.replace("barangay_", "")
            try:
                recipient_id = UUID(barangay_id)
                recipient_role = "barangay"
            except ValueError:
                raise HTTPException(400, "Invalid barangay ID")
            
            msg = Message(
                sender_id=user.id,
                recipient_id=recipient_id,
                recipient_role=recipient_role,
                subject=subject,
                content=content,
                is_urgent=is_urgent,
                has_attachment=has_attachment,
                attachment_filename=attachment_filename,
                parent_message_id=parent_id,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)
            
            return {
                "id": str(msg.id),
                "status": "sent",
                "message": "Message sent successfully",
                "attachment_filename": attachment_filename,
            }
        
        elif recipient.startswith("admin_"):
            # Send to specific admin
            admin_id = recipient.replace("admin_", "")
            try:
                recipient_id = UUID(admin_id)
            except ValueError:
                raise HTTPException(400, "Invalid admin ID")
            
            msg = Message(
                sender_id=user.id,
                recipient_id=recipient_id,
                recipient_role="admin",
                subject=subject,
                content=content,
                is_urgent=is_urgent,
                has_attachment=has_attachment,
                attachment_filename=attachment_filename,
                parent_message_id=parent_id,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)
            
            return {
                "id": str(msg.id),
                "status": "sent",
                "message": "Message sent successfully",
                "attachment_filename": attachment_filename,
            }
        
        else:
            # Fallback for other role-based recipients
            recipient_id = None
            recipient_role = recipient
            
            msg = Message(
                sender_id=user.id,
                recipient_id=recipient_id,
                recipient_role=recipient_role,
                subject=subject,
                content=content,
                is_urgent=is_urgent,
                has_attachment=has_attachment,
                attachment_filename=attachment_filename,
                parent_message_id=parent_id,
            )
            db.add(msg)
            await db.commit()
            await db.refresh(msg)
            
            return {
                "id": str(msg.id),
                "status": "sent",
                "message": "Message sent successfully",
                "attachment_filename": attachment_filename,
            }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending message: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Failed to send message: {str(e)}")


@router.put("/{message_id}/read")
async def mark_read(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        msg = await db.get(Message, message_id)
        if not msg:
            raise HTTPException(404, "Message not found")
        msg.status = MessageStatus.read
        await db.commit()
        return {"status": "read"}
    except Exception as e:
        print(f"Error marking message as read: {e}")
        raise HTTPException(500, f"Failed to mark message as read: {str(e)}")


@router.get("/recipients")
async def get_recipients(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get list of possible message recipients based on user role"""
    try:
        recipients = []
        
        if user.role.value == "super_admin":
            # Super admin can message: other super admins, all barangays, and all admins
            recipients.append({
                "id": "super_admin",
                "name": "All Super Admins",
                "type": "role"
            })
            
            # Get all barangays
            barangays = (await db.scalars(
                select(Barangay).order_by(Barangay.name)
            )).all()
            
            for brgy in barangays:
                recipients.append({
                    "id": f"barangay_{brgy.id}",
                    "name": f"{brgy.name} (Barangay)",
                    "type": "barangay"
                })
            
            # Get all admin users
            admins = (await db.scalars(
                select(User).where(User.role == "admin").order_by(User.username)
            )).all()
            
            for admin in admins:
                recipients.append({
                    "id": f"admin_{admin.id}",
                    "name": f"{admin.username} (Admin)",
                    "type": "admin"
                })
        else:
            # Regular admins can only message super admin
            recipients.append({
                "id": "super_admin",
                "name": "Super Admin",
                "type": "role"
            })
        
        return recipients
    except Exception as e:
        print(f"Error fetching recipients: {e}")
        return []


@router.get("/recipients/search")
async def search_recipients(query: str = "", db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Search for recipients by name"""
    try:
        if not query or len(query) < 2:
            return []
        
        results = []
        query_lower = query.lower()
        
        if user.role.value == "super_admin":
            # Search barangays
            barangays = (await db.scalars(
                select(Barangay).where(
                    Barangay.name.ilike(f"%{query}%")
                ).order_by(Barangay.name).limit(10)
            )).all()
            
            for brgy in barangays:
                results.append({
                    "id": f"barangay_{brgy.id}",
                    "name": f"{brgy.name}",
                    "type": "barangay"
                })
            
            # Search admins
            admins = (await db.scalars(
                select(User).where(
                    (User.role == "admin") & (User.username.ilike(f"%{query}%"))
                ).order_by(User.username).limit(10)
            )).all()
            
            for admin in admins:
                results.append({
                    "id": f"admin_{admin.id}",
                    "name": f"{admin.username}",
                    "type": "admin"
                })
        
        return results
    except Exception as e:
        print(f"Error searching recipients: {e}")
        return []


@router.get("/{message_id}/thread")
async def get_message_thread(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Get a message and all its replies (thread view like email)"""
    try:
        # Get the root message (find the original message if this is a reply)
        msg = await db.get(Message, message_id)
        if not msg:
            raise HTTPException(404, "Message not found")
        
        root_id = msg.parent_message_id or msg.id
        
        # Get all messages in the thread
        stmt = select(Message).where(
            or_(
                Message.id == root_id,
                Message.parent_message_id == root_id
            )
        ).order_by(Message.created_at.asc()).options(
            selectinload(Message.sender),
            selectinload(Message.recipient)
        )
        
        threads = list((await db.scalars(stmt)).all())
        return [_msg_out(m) for m in threads]
    except Exception as e:
        print(f"Error fetching message thread: {e}")
        raise HTTPException(500, f"Failed to fetch message thread: {str(e)}")


@router.get("/{message_id}/download")
async def download_attachment(message_id: UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Download attachment from a message"""
    try:
        msg = await db.get(Message, message_id)
        if not msg:
            raise HTTPException(404, "Message not found")
        
        if not msg.has_attachment or not msg.attachment_filename:
            raise HTTPException(404, "No attachment found")
        
        filepath = UPLOAD_DIR / msg.attachment_filename
        
        if not filepath.exists():
            raise HTTPException(404, "Attachment file not found")
        
        return FileResponse(
            filepath,
            filename=msg.attachment_filename.split("_", 1)[1],  # Remove user ID prefix
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading attachment: {e}")
        raise HTTPException(500, f"Failed to download attachment: {str(e)}")
