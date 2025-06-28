class EmotiChat {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.chatMessages = document.getElementById('chatMessages');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.clearHistoryBtn = document.getElementById('clearHistory');
        
        this.isTyping = false;
        this.messageQueue = [];
        
        this.init();
    }
    
    init() {
        // Bind event listeners
        this.chatForm.addEventListener('submit', this.handleSubmit.bind(this));
        this.messageInput.addEventListener('keypress', this.handleKeyPress.bind(this));
        this.messageInput.addEventListener('input', this.handleInput.bind(this));
        this.clearHistoryBtn.addEventListener('click', this.clearHistory.bind(this));
        
        // Handle suggested messages
        document.querySelectorAll('.suggested-msg').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.messageInput.value = e.target.dataset.msg;
                this.messageInput.focus();
            });
        });
        
        // Auto-scroll to bottom
        this.scrollToBottom();
        
        // Focus input on load
        this.messageInput.focus();
    }
    
    handleSubmit(e) {
        e.preventDefault();
        const message = this.messageInput.value.trim();
        
        if (!message || this.isTyping) {
            return;
        }
        
        this.sendMessage(message);
    }
    
    handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.chatForm.dispatchEvent(new Event('submit'));
        }
    }
    
    handleInput(e) {
        const hasContent = e.target.value.trim().length > 0;
        this.sendButton.style.opacity = hasContent ? '1' : '0.7';
    }
    
    async sendMessage(message) {
        // Clear input and disable form
        this.messageInput.value = '';
        this.setTypingState(true);
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Hide welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            if (data.success) {
                // Add AI response with typing effect
                this.addMessage(data.ai_response, 'ai', data.timestamp);
            } else {
                this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
                console.error('Error:', data.error);
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Connection error. Please check your internet and try again.', 'ai');
            console.error('Network error:', error);
        } finally {
            this.setTypingState(false);
        }
    }
    
    addMessage(text, sender, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message mb-3`;
        
        const currentTime = timestamp || new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        
        const icon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="${icon} message-icon"></i>
                <div class="message-text">${this.escapeHtml(text)}</div>
                <small class="message-time">${currentTime}</small>
            </div>
        `;
        
        // Add animation class
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        this.chatMessages.appendChild(messageDiv);
        
        // Trigger animation
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease-out';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
        
        this.scrollToBottom();
        
        // Add typing effect for AI messages
        if (sender === 'ai') {
            this.typeWriter(messageDiv.querySelector('.message-text'), text);
        }
    }
    
    typeWriter(element, text, speed = 30) {
        element.textContent = '';
        let i = 0;
        
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                this.scrollToBottom();
            } else {
                clearInterval(timer);
            }
        }, speed);
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    setTypingState(isTyping) {
        this.isTyping = isTyping;
        this.sendButton.disabled = isTyping;
        this.messageInput.disabled = isTyping;
        
        if (isTyping) {
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
            this.messageInput.focus();
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async clearHistory() {
        if (!confirm('Are you sure you want to clear your chat history? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('/clear_history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Clear chat messages
                this.chatMessages.innerHTML = `
                    <div class="welcome-message text-center py-5">
                        <i class="fas fa-heart fa-3x text-primary mb-3 pulse-animation"></i>
                        <h4>Chat History Cleared!</h4>
                        <p class="text-muted">Start a new conversation below.</p>
                        <div class="suggested-messages">
                            <button class="btn btn-outline-primary btn-sm me-2 mb-2 suggested-msg" data-msg="I'm feeling overwhelmed today">I'm feeling overwhelmed</button>
                            <button class="btn btn-outline-primary btn-sm me-2 mb-2 suggested-msg" data-msg="I need some motivation">I need motivation</button>
                            <button class="btn btn-outline-primary btn-sm mb-2 suggested-msg" data-msg="I'm having trouble sleeping">Sleep troubles</button>
                        </div>
                    </div>
                `;
                
                // Re-bind suggested message events
                document.querySelectorAll('.suggested-msg').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.messageInput.value = e.target.dataset.msg;
                        this.messageInput.focus();
                    });
                });
                
                // Show success message
                this.showNotification('Chat history cleared successfully!', 'success');
                
            } else {
                this.showNotification('Failed to clear history. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Error clearing history:', error);
            this.showNotification('Connection error. Please try again.', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('chatForm')) {
        new EmotiChat();
    }
});

// Handle page visibility for better UX
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && document.getElementById('messageInput')) {
        document.getElementById('messageInput').focus();
    }
});
