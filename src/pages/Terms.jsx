import React from 'react';

export default function Terms() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Terms of Service</h2>
      <div className="prose prose-sm max-w-none">
        <p>This is a placeholder for the Terms of Service page. Please replace this content with the actual terms.</p>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}