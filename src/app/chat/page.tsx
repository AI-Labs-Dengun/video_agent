import React from 'react';

const Chat = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-semibold">Chat App</h1>
      </header>
      <main className="flex-1 p-4 overflow-y-auto">
        {/* Chat messages will go here */}
        <p>Chat interface goes here...</p>
      </main>
      <footer className="bg-white p-4 border-t">
        {/* Message input will go here */}
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full p-2 border rounded"
        />
      </footer>
    </div>
  );
};

export default Chat; 