document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    const mainContainer = document.querySelector('.main-container');

    // --- Dynamic Height Logic ---
    function checkOverflowAndExpand() {
        // buffer of 5px to avoid sensitivity
        if (chatMessages.scrollHeight > chatMessages.clientHeight + 5) {
            const currentHeight = mainContainer.offsetHeight; // Get current rendered height
            const maxHeight = window.innerHeight * 0.9; // Max 90% of screen height

            if (currentHeight < maxHeight) {
                let newHeight = currentHeight * 1.10; // Increase by 10%
                if (newHeight > maxHeight) newHeight = maxHeight; // Cap at max
                mainContainer.style.height = `${newHeight}px`;
            }
        }
    }



    // --- Scrolling Logic ---
    function scrollToBottom() {
        checkOverflowAndExpand(); // Check height before scrolling
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    const scrollDownBtn = document.getElementById('scroll-down-btn');
    const scrollUpBtn = document.getElementById('scroll-up-btn');

    chatMessages.addEventListener('scroll', () => {
        // Scroll Down Button Logic (Show if not at bottom)
        const threshold = 50;
        const isNearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
        if (isNearBottom) {
            scrollDownBtn.classList.add('hidden');
        } else {
            scrollDownBtn.classList.remove('hidden');
        }

        // Scroll Up Button Logic (Show if not at top)
        if (chatMessages.scrollTop > threshold) {
            scrollUpBtn.classList.remove('hidden');
        } else {
            scrollUpBtn.classList.add('hidden');
        }
    });

    scrollDownBtn.addEventListener('click', () => {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    });

    scrollUpBtn.addEventListener('click', () => {
        chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Typing Effect ---
    function typeText(element, text, speed = 15) {
        return new Promise((resolve) => {
            let index = 0;
            element.textContent = ''; // Clear initial content

            // Add blinking cursor
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            element.appendChild(cursor);

            function type() {
                if (index < text.length) {
                    // Safe append for text nodes
                    cursor.before(text.charAt(index));
                    index++;

                    // Auto-scroll while typing
                    scrollToBottom();

                    setTimeout(type, speed);
                } else {
                    cursor.remove(); // Remove cursor when done
                    resolve();
                }
            }
            type();
        });
    }

    // --- Message Handling ---
    async function addMessage(text, isUser, animate = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');

        chatMessages.appendChild(messageDiv);

        if (animate && !isUser) {
            await typeText(messageDiv, text);
        } else {
            messageDiv.textContent = text;
        }

        scrollToBottom();
    }

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // User message (no animation)
        await addMessage(text, true);

        userInput.value = '';
        userInput.disabled = true;

        // Loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('message', 'bot-message');
        loadingDiv.textContent = 'Thinking... 🤔';
        chatMessages.appendChild(loadingDiv);
        scrollToBottom();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            // Remove loading
            chatMessages.removeChild(loadingDiv);

            if (data.answer) {
                // Bot message (with animation)
                await addMessage(data.answer, false, true);
            } else {
                await addMessage('Oops! Something went wrong. 😕', false, true);
            }
        } catch (error) {
            if (chatMessages.contains(loadingDiv)) {
                chatMessages.removeChild(loadingDiv);
            }
            addMessage('Error connecting to the school buddy. Please try again later.', false);
            console.error('Error:', error);
        } finally {
            userInput.disabled = false;
            userInput.focus();
        }
    }

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
});
