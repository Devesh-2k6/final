const fs = require('fs');
const path = require('path');

const qrPath = 'C:/Users/DEVESH/.gemini/antigravity/brain/c7b7a8ae-f7db-41cb-bc63-0982df600149/expo-qr.png';
const b64 = fs.readFileSync(qrPath).toString('base64');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExpiryGo Expo Go Scanner</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 antialiased p-4 sm:p-6 flex items-center justify-center min-h-screen">
  <div class="bg-white border border-purple-100 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6 text-center">
    
    <!-- Header -->
    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
      <div class="flex items-center gap-3 text-left">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-700 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-purple-600/30">
          🌱
        </div>
        <div>
          <h2 class="text-slate-900 font-black text-lg leading-tight">ExpiryGo Mobile App</h2>
          <p class="text-purple-600 text-xs font-bold">Expo Go Global Tunnel</p>
        </div>
      </div>
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Connected
      </span>
    </div>

    <!-- Scannable QR Code -->
    <div class="flex flex-col items-center justify-center p-6 bg-purple-50/40 rounded-3xl border border-purple-100 shadow-inner">
      <div class="w-64 h-64 p-3 bg-white rounded-2xl shadow-md border border-purple-100 flex items-center justify-center">
        <img src="data:image/png;base64,${b64}" alt="ExpiryGo QR Code" class="w-full h-full object-contain" />
      </div>
      <div class="mt-4 w-full">
        <p class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Direct Connection URL</p>
        <p class="text-purple-700 font-mono text-xs font-black bg-white border border-purple-200 px-3 py-2 rounded-xl text-center select-all break-all shadow-xs">
          exp://c1uc_ro-anonymous-8081.exp.direct
        </p>
      </div>
    </div>

    <!-- Instructions -->
    <div class="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-left space-y-2">
      <p class="font-black text-xs text-purple-900 flex items-center gap-1.5">
        <span>📱</span> How to Scan on your Phone:
      </p>
      <ol class="text-xs text-slate-600 space-y-1 list-decimal list-inside font-medium leading-relaxed">
        <li>Open <strong class="text-slate-900">Expo Go</strong> on Android or iOS.</li>
        <li>Tap <strong class="text-slate-900">Scan QR code</strong> and point your camera at the screen.</li>
        <li><em>(Alternative)</em> Tap <strong class="text-slate-900">Enter URL manually</strong> and paste the URL above.</li>
      </ol>
    </div>

    <!-- Live Sync Pill -->
    <div class="text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      <span>100% Synchronized with <a href="https://expirygo.vercel.app" target="_blank" class="text-purple-600 font-bold underline">expirygo.vercel.app</a></span>
    </div>

  </div>
</body>
</html>`;

fs.writeFileSync('C:/Users/DEVESH/.gemini/antigravity/brain/c7b7a8ae-f7db-41cb-bc63-0982df600149/expo_scanner_card.html', html);
console.log('HTML written successfully.');

