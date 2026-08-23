let activeScanner = null;
let scanResultCallback = null;

function openScanner(onResult){
  if(typeof Html5Qrcode === 'undefined'){
    showToast('Scanner is still loading — try again in a moment.');
    return;
  }
  scanResultCallback = onResult;
  document.getElementById('scannerModal').hidden = false;

  activeScanner = new Html5Qrcode('scannerView');
  const config = {
    fps: 10,
    qrbox: { width: 260, height: 160 },
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.CODABAR,
      Html5QrcodeSupportedFormats.ITF,
      Html5QrcodeSupportedFormats.QR_CODE
    ]
  };

  activeScanner.start(
    { facingMode: 'environment' },
    config,
    (decodedText)=>{
      const cb = scanResultCallback;
      closeScanner();
      if(cb) cb(decodedText);
    },
    ()=>{ /* per-frame scan errors are expected while aiming — ignore */ }
  ).catch(()=>{
    showToast('Could not open the camera. Check camera permission for this site.');
    closeScanner();
  });
}

function closeScanner(){
  document.getElementById('scannerModal').hidden = true;
  if(activeScanner){
    activeScanner.stop().then(()=>{
      activeScanner.clear();
      activeScanner = null;
    }).catch(()=>{
      activeScanner = null;
    });
  }
}

document.getElementById('scannerClose').addEventListener('click', closeScanner);
