"use client";
import "@/styles/admin.css";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  Plus,
  Inbox,
  Send as SendIcon,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  User,
  Building2,
  AlertCircle,
  Loader2
} from "lucide-react";

interface Message {
  id: string;
  subject: string;
  content: string;
  sender: string;
  sender_role: string;
  recipient: string;
  recipient_role: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  has_attachment: boolean;
  is_urgent: boolean;
}

export default function MessagingPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    recipient: "",
    subject: "",
    content: "",
    is_urgent: false,
    attachment: null as File | null,
  });
  const [attachmentError, setAttachmentError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState<any[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [filteredRecipients, setFilteredRecipients] = useState<any[]>([]);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  // Fetch recipients when compose dialog opens
  useEffect(() => {
    if (showCompose) {
      fetchRecipients();
    }
  }, [showCompose]);

  // Filter recipients based on search
  useEffect(() => {
    if (recipientSearch.trim().length === 0) {
      setFilteredRecipients(recipientOptions);
    } else {
      const query = recipientSearch.toLowerCase();
      const filtered = recipientOptions.filter((opt: any) =>
        opt.name.toLowerCase().includes(query)
      );
      setFilteredRecipients(filtered);
    }
  }, [recipientSearch, recipientOptions]);

  const fetchRecipients = async () => {
    try {
      const response = await api.get("/api/messages/recipients");
      setRecipientOptions(response.data);
      setFilteredRecipients(response.data);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      setRecipientOptions([]);
    }
  };

  const handleRecipientSearch = (query: string) => {
    setRecipientSearch(query);
  };

  const { data: inbox, isLoading: inboxLoading, error: inboxError, refetch: refetchInbox } = useQuery({
    queryKey: ["messages-inbox"],
    queryFn: () => api.get("/api/messages/inbox").then((r) => r.data),
    enabled: activeTab === "inbox",
    staleTime: 2000, // Cache for 2 seconds
    retry: 2,
    retryDelay: 500,
  });

  const { data: sent, isLoading: sentLoading, error: sentError, refetch: refetchSent } = useQuery({
    queryKey: ["messages-sent"],
    queryFn: () => api.get("/api/messages/sent").then((r) => r.data),
    enabled: activeTab === "sent",
    staleTime: 2000, // Cache for 2 seconds
    retry: 2,
    retryDelay: 500,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      formData.append("recipient", data.recipient);
      formData.append("subject", data.subject);
      formData.append("content", data.content);
      formData.append("is_urgent", data.is_urgent.toString());
      if (data.attachment) {
        formData.append("file", data.attachment);
      }
      
      const response = await api.post("/api/messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      // Immediate refetch to show new message
      await Promise.all([
        refetchInbox(),
        refetchSent(),
      ]);
      
      queryClient.invalidateQueries({ queryKey: ["messages-sent"] });
      queryClient.invalidateQueries({ queryKey: ["messages-inbox"] });
      
      setShowCompose(false);
      setComposeForm({ recipient: "", subject: "", content: "", is_urgent: false, attachment: null });
      setAttachmentError("");
      setSuccessMessage("Message sent successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to send message";
      setAttachmentError(errorMsg);
      console.error("Send message error:", error);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => api.put(`/api/messages/${messageId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages-inbox"] });
    },
  });

  const filteredMessages = (activeTab === "inbox" ? inbox : sent)?.filter((msg: Message) =>
    msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    msg.sender.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!composeForm.recipient.trim()) {
      setAttachmentError("Please select a recipient");
      return;
    }
    if (!composeForm.subject.trim()) {
      setAttachmentError("Please enter a subject");
      return;
    }
    if (!composeForm.content.trim()) {
      setAttachmentError("Please enter message content");
      return;
    }
    
    setAttachmentError("");
    setShowRecipientDropdown(false);
    sendMessageMutation.mutate(composeForm);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setAttachmentError("File size must be less than 10MB");
      return;
    }

    // Validate file type (allow common documents and images)
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "text/plain",
      "application/msword",
    ];

    if (!allowedTypes.includes(file.type)) {
      setAttachmentError("File type not allowed. Use PDF, Word, Excel, Images, or Text files.");
      return;
    }

    setAttachmentError("");
    setComposeForm({ ...composeForm, attachment: file });
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    setReplyContent("");
    if (activeTab === "inbox" && message.status !== "read") {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleDownloadAttachment = async (messageId: string) => {
    try {
      const response = await api.get(`/api/messages/${messageId}/download`, {
        responseType: "blob",
      });
      
      if (!response || !response.data) {
        alert("Failed to download file");
        return;
      }
      
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      // Extract filename from the UUID_filename pattern by removing UUID prefix
      const fullFilename = (selectedMessage as any)?.attachment_filename;
      const filename = fullFilename ? fullFilename.split("_").slice(1).join("_") : "attachment";
      link.download = filename || "attachment";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 1500);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download attachment");
    }
  };

  const handleReplyMessage = async (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    
    if (!replyContent.trim()) {
      setAttachmentError("Reply cannot be empty");
      return;
    }
    
    setReplyLoading(true);
    
    try {
      const replySubject = selectedMessage?.subject.startsWith("Re:") 
        ? selectedMessage.subject 
        : `Re: ${selectedMessage?.subject}`;
      
      const formData = new FormData();
      formData.append("recipient", composeForm.recipient || selectedMessage?.sender_role || "admin");
      formData.append("subject", replySubject);
      formData.append("content", replyContent);
      formData.append("is_urgent", "false");
      formData.append("parent_message_id", messageId);
      
      const response = await api.post("/api/messages", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      // Refetch both inboxes
      await Promise.all([
        refetchInbox(),
        refetchSent(),
      ]);
      
      setReplyContent("");
      setSuccessMessage("Reply sent successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Close message after reply
      setTimeout(() => setSelectedMessage(null), 1500);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || "Failed to send reply";
      setAttachmentError(errorMsg);
      console.error("Reply error:", error);
    } finally {
      setReplyLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="h-4 w-4 text-slate-400" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case "read":
        return <CheckCheck className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (inboxLoading || sentLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading messages...</div>
      </div>
    );
  }

  if (inboxError || sentError) {
    const error = inboxError || sentError;
    const errorMessage = (error as any)?.message || "Failed to fetch messages";
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-semibold">Error loading messages</p>
        <p className="text-red-600 text-sm">{errorMessage}</p>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["messages-inbox"] });
            queryClient.invalidateQueries({ queryKey: ["messages-sent"] });
          }}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-container space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-green-700 font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <div className="admin-page-header flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messaging Center</h1>
          <p className="text-sm">Direct communication with Super Admin and Barangay Admins</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="admin-action-btn-emerald flex items-center gap-2 px-4 py-2.5 text-xs text-white"
        >
          <Plus className="h-4 w-4" />
          New Message
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "inbox"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Inbox className="h-4 w-4" />
            Inbox
            {inbox?.filter((m: Message) => m.status !== "read").length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {inbox?.filter((m: Message) => m.status !== "read").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "sent"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <SendIcon className="h-4 w-4" />
            Sent
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Messages List */}
      <div className="admin-glass-panel">
        <div className="divide-y divide-slate-200">
          {filteredMessages.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm">No messages found</p>
            </div>
          ) : (
            filteredMessages.map((message: Message) => (
              <div
                key={message.id}
                onClick={() => handleSelectMessage(message)}
                className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                  selectedMessage?.id === message.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                  } ${message.status !== "read" && activeTab === "inbox" ? "bg-slate-50" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{message.sender}</p>
                        {message.is_urgent && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {message.has_attachment && (
                          <Paperclip className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTab === "sent" && getStatusIcon(message.status)}
                        <span className="text-xs text-slate-500">{formatTimestamp(message.timestamp)}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-1">{message.subject}</p>
                    <p className="text-sm text-slate-600 mt-1 truncate">{message.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {message.sender_role.replace("_", " ")}
                      </span>
                      {activeTab === "inbox" && (
                        <>
                          <span>→</span>
                          <span>{message.recipient}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMessage.subject}</h2>
                <p className="text-xs text-slate-500 mt-1">Message ID: {selectedMessage.id.substring(0, 8)}</p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* From/To Info */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">From</p>
                    <p className="text-sm text-slate-900 font-medium">{selectedMessage.sender}</p>
                    <p className="text-xs text-slate-600">{selectedMessage.sender_role.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">To</p>
                    <p className="text-sm text-slate-900 font-medium">{selectedMessage.recipient}</p>
                    <p className="text-xs text-slate-600">{selectedMessage.recipient_role.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="text-xs text-slate-600">
                      {formatTimestamp(selectedMessage.timestamp)}
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedMessage.is_urgent && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded">
                          <AlertCircle className="h-3 w-3" />
                          Urgent
                        </span>
                      )}
                      {activeTab === "sent" && getStatusIcon(selectedMessage.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="admin-glass-panel p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedMessage.content}</p>
              </div>

              {/* Attachment */}
              {selectedMessage.has_attachment && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Attachment included</p>
                        <p className="text-xs text-blue-700">{(selectedMessage as any)?.attachment_filename || "File attached"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(selectedMessage.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reply Section */}
            <div className="border-t border-slate-200 p-6 bg-slate-50">
              <form onSubmit={(e) => handleReplyMessage(e, selectedMessage.id)} className="space-y-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || replyLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {replyLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Reply
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">New Message</h2>
              <button
                onClick={() => {
                  setShowCompose(false);
                  setShowRecipientDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSendMessage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search recipients (barangay, admin, etc)..."
                    value={recipientSearch}
                    onChange={(e) => handleRecipientSearch(e.target.value)}
                    onFocus={() => setShowRecipientDropdown(true)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {/* Dropdown Results */}
                  {showRecipientDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredRecipients.length === 0 ? (
                        <div className="p-3 text-sm text-slate-500 text-center">
                          No recipients found
                        </div>
                      ) : (
                        filteredRecipients.map((recipient: any) => (
                          <button
                            key={recipient.id}
                            type="button"
                            onClick={() => {
                              setComposeForm({ ...composeForm, recipient: recipient.id });
                              setRecipientSearch(recipient.name);
                              setShowRecipientDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{recipient.name}</p>
                                <p className="text-xs text-slate-500">{recipient.type}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Selected Recipient Display */}
                  {composeForm.recipient && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center justify-between">
                      <span>{recipientSearch}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setComposeForm({ ...composeForm, recipient: "" });
                          setRecipientSearch("");
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  rows={6}
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="urgent"
                  checked={composeForm.is_urgent}
                  onChange={(e) => setComposeForm({ ...composeForm, is_urgent: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="urgent" className="text-sm text-slate-700">Mark as urgent</label>
              </div>
              
              {/* File Attachment Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-attachment"
                    onChange={handleFileAttach}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("file-attachment")?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Paperclip className="h-4 w-4" />
                    Attach File
                  </button>
                </div>
                
                {attachmentError && (
                  <p className="text-xs text-red-600">{attachmentError}</p>
                )}
                
                {composeForm.attachment && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm text-green-700 font-medium">
                      ✓ {composeForm.attachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setComposeForm({ ...composeForm, attachment: null });
                        setAttachmentError("");
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendMessageMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sendMessageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
