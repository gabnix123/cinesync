import React from 'react';

export default function Privacy() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Privacy Policy</h2>
      <div className="prose prose-sm max-w-none">
        <p>This is a placeholder for the Privacy Policy page. Please replace this content with the actual privacy policy.</p>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}