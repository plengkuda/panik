// functions/_middleware.js - Middleware untuk aplikasi ITKessu

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  // Periksa apakah permintaan berasal dari GoogleBot atau cache AMP
  const userAgent = request.headers.get('User-Agent') || '';
  const isFromGoogle = userAgent.includes('Googlebot') || userAgent.includes('Google-AMP');
  const isFromAMPCache = url.hostname.includes('cdn.ampproject.org') || 
                         url.hostname.includes('amp.cloudflare.com');
  
  // Jika ini adalah permintaan untuk target.txt, biarkan diproses secara normal
  if (url.pathname.endsWith('/target.txt')) {
    return next();
  }
  
  try {
    // Baca file target.txt (dengan asumsi file ini ada di folder assets atau public)
    let targetContent;
    try {
      // Gunakan Cloudflare KV atau sistem file untuk membaca target.txt
      const targetResponse = await fetch(new URL('/target.txt', url.origin));
      
      if (!targetResponse.ok) {
        throw new Error(`Gagal mengambil target.txt: ${targetResponse.status}`);
      }
      
      targetContent = await targetResponse.text();
    } catch (error) {
      console.error('Error saat memuat target.txt:', error);
      // Jika target.txt tidak dapat dibaca, gunakan data fallback
      targetContent = 'itkessu\nsiakad\nperpustakaan\nkemahasiswaan\nriset\nkeuangan\nalumni\nppmb\nelearning\ncareer';
    }
    
    // Parse konten dari target.txt ke dalam array dengan format URL yang benar
    const sitesMap = new Map(); // Untuk menyimpan pasangan originalName -> urlFormat
    
    // Array untuk tampilan dan pemrosesan
    const sites = targetContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Buat map untuk mencari nama situs dan format URL
    sites.forEach(site => {
      // Format URL: Jika situs berisi spasi, ganti dengan tanda hubung
      let urlFormat = site;
      if (site.includes(' ')) {
        urlFormat = site.replace(/\s+/g, '-');
      }
      // Simpan ke map untuk referensi nanti
      sitesMap.set(urlFormat.toLowerCase(), site);
      // Simpan juga versi tanpa tanda hubung, tanpa spasi
      sitesMap.set(site.toLowerCase().replace(/\s+/g, ''), site);
    });
    
    // Cari tahu situs mana yang sedang diakses
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    const currentSite = pathSegments.length > 0 ? pathSegments[0].toLowerCase() : '';
    
    // Periksa apakah situs yang diakses ada dalam map
    const originalSiteName = sitesMap.get(currentSite) || 
                             sitesMap.get(currentSite.replace(/-/g, '')) ||
                             sitesMap.get(currentSite.replace(/-/g, ' '));
    
    if (originalSiteName || pathSegments.length === 0) {
      // Pilih situs berdasarkan path atau gunakan random jika path kosong
      const siteToUse = originalSiteName || sites[Math.floor(Math.random() * sites.length)];
      
      // Buat format URL yang benar untuk canonical
      let urlFormattedSite = siteToUse;
      if (siteToUse.includes(' ')) {
        urlFormattedSite = siteToUse.replace(/\s+/g, '-');
      }
      
      // Buat URL kanonik
      const canonicalOrigin = 'https://itkessu.ac.id/app/';
      const canonicalUrl = `${canonicalOrigin}${urlFormattedSite}/`;
      
      // Generate AMP HTML dengan desain yang sesuai ITKessu
      const ampHtml = generateITKessuAmpHtml(siteToUse, canonicalUrl);
      
      // Tambahkan header AMP yang diperlukan
      const headers = new Headers();
      headers.set('Content-Type', 'text/html');
      headers.set('AMP-Cache-Transform', 'google;v="1..100"');
      
      // Jika permintaan berasal dari GoogleBot, sertakan header Link untuk kanonik
      if (isFromGoogle || isFromAMPCache) {
        headers.set('Link', `<${canonicalUrl}>; rel="canonical"`);
      }
      
      // Aktifkan cache yang lebih lama - 30 hari
      const ONE_MONTH_IN_SECONDS = 30 * 24 * 60 * 60; // 30 hari dalam detik
      headers.set('Cache-Control', `public, max-age=${ONE_MONTH_IN_SECONDS}, s-maxage=${ONE_MONTH_IN_SECONDS}, immutable`);
      
      // Header tambahan untuk memastikan caching di berbagai sistem
      headers.set('Expires', new Date(Date.now() + ONE_MONTH_IN_SECONDS * 1000).toUTCString());
      headers.set('Surrogate-Control', `max-age=${ONE_MONTH_IN_SECONDS}`);
      headers.set('CDN-Cache-Control', `max-age=${ONE_MONTH_IN_SECONDS}`);
      
      // Opsional: Set ETag untuk validasi cache yang efisien
      const etag = `"${siteToUse}-${Date.now().toString(36)}"`;
      headers.set('ETag', etag);
      
      return new Response(ampHtml, {
        headers: headers
      });
    }
    
    // Jika situs tidak ditemukan, lanjutkan ke handler berikutnya
    return next();
    
  } catch (error) {
    console.error('Error dalam middleware:', error);
    return new Response('Kesalahan Server Internal', { status: 500 });
  }
}

// Fungsi untuk menghasilkan HTML AMP lengkap dengan desain yang sesuai ITKessu
function generateITKessuAmpHtml(siteName, canonicalUrl) {
  // Generate deskripsi bervariasi dan konten
  const descriptions = [
    `Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. ${siteName.toUpperCase()} adalah modul penting dalam sistem informasi kampus.`,
    `Portal ${siteName.toUpperCase()} - bagian dari aplikasi ITKessu yang memberikan akses mudah untuk data kampus, jadwal perkuliahan, dan layanan administratif lainnya bagi mahasiswa dan dosen.`,
    `${siteName.toUpperCase()} - Sistem terintegrasi Institut Teknologi dan Kesehatan Sumatera Utara yang menyediakan akses cepat ke layanan akademik, perpustakaan digital, dan manajemen kampus.`,
    `Layanan ${siteName.toUpperCase()} ITKessu - platform digital yang mendukung kegiatan akademik dan administratif untuk meningkatkan kualitas pendidikan di Institut Teknologi dan Kesehatan Sumatera Utara.`
  ];
  
  const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)];
  
  // URL untuk login resmi
  const loginUrl = "https://itkessu.ac.id/login";
  
  // Gambar untuk tampilan
  const imageSources = [
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/building.webp",
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/lab.webp",
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/library.webp",
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/logo.webp",
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/students.webp",
    "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/classroom.webp"
  ];
  
  // Template HTML AMP lengkap dengan desain yang sesuai
  return `<!DOCTYPE html>
<html amp lang="id">
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${siteName}: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara</title>
      <meta name="description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta name="robots" content="index, follow"/>
      <meta name="theme-color" content="#003366"/> 
      <link rel="canonical" href="${canonicalUrl}"/>
      <link rel="icon" type="image/x-icon" href="https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/favicon.ico"/>
      <meta property="og:url" content="${canonicalUrl}"/>
      <meta property="og:site_name" content="ITKessu - ${siteName}"/>
      <meta property="og:image:alt" content="ITKessu - ${siteName}"/>
      <meta property="og:image" content="https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/og-image.webp"/>
      <meta property="og:title" content="${siteName}: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara"/>
      <meta property="og:description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta property="og:locale" content="ID_id"/>
      <meta property="og:type" content="website"/>
      <meta name="twitter:card" content="summary"/>
      <meta name="twitter:title" content="${siteName}: Portal Layanan Terpadu Institut Teknologi dan Kesehatan Sumatera Utara"/>
      <meta name="twitter:description" content="Aplikasi resmi Institut Teknologi dan Kesehatan Sumatera Utara (ITKessu) menyediakan layanan akademik, administrasi, dan pembelajaran terintegrasi bagi seluruh civitas akademika. Akses mudah untuk sistem informasi mahasiswa, jadwal kuliah, perpustakaan digital, dan layanan kampus dalam satu platform."/>
      <meta name="twitter:image:src" content="https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/twitter-image.webp"/>
      <link rel="shortcut icon" type="image/x-icon" href="https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/favicon.ico" />
      <script type="application/ld+json">
         {
           "@context": "https://schema.org",
           "@type": "WebApplication",
           "name": "ITKessu - ${siteName}",
           "url": "${canonicalUrl}",
           "image": "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/og-image.webp",
           "description": "${randomDesc}",
           "applicationCategory": "EducationalApplication",
           "operatingSystem": "All",
           "offers": {
             "@type": "Offer",
             "price": "0"
           },
           "author": {
             "@type": "Organization",
             "name": "Institut Teknologi dan Kesehatan Sumatera Utara",
             "url": "https://itkessu.ac.id"
           },
           "publisher": {
             "@type": "Organization",
             "name": "Institut Teknologi dan Kesehatan Sumatera Utara",
             "logo": {
               "@type": "ImageObject",
               "url": "https://res.cloudinary.com/itkessucloud/image/upload/v1/campus/logo.webp"
             }
           }
         }
      </script>
      <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"/>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"/>
      <link rel="preload" as="script" href="https://cdn.ampproject.org/v0.js"/>
      <link rel="preload" as="image" href="${imageSources[0]}"/>
      <link rel="preload" as="image" href="${imageSources[1]}"/>
      <script async src="https://cdn.ampproject.org/v0.js"></script>
      <style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript><style amp-custom>
      /* Reset dan style dasar */
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Roboto, sans-serif;background:#f5f5f5;color:#333;display:flex;justify-content:center;align-items:center;min-height:100vh;overflow-x:hidden;padding:20px;flex-direction:column;}
      
      /* Container layout */
      .container{width:100%;max-width:1024px;display:flex;flex-direction:column;align-items:center;position:relative;margin:0 auto;}
      
      /* Header styling */
      .header{width:100%;background:#003366;color:white;text-align:center;padding:20px;border-radius:8px 8px 0 0;margin-bottom:20px;}
      .header h1{font-size:24px;margin-bottom:10px;}
      .header p{font-size:16px;opacity:0.8;}
      
      /* Logo styling */
      .logo-container{display:flex;justify-content:center;margin-bottom:20px;}
      .logo{width:150px;height:auto;}
      
      /* Content sections */
      .content-section{width:100%;background:white;border-radius:8px;padding:20px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
      .section-title{color:#003366;margin-bottom:15px;font-size:20px;border-bottom:2px solid #003366;padding-bottom:5px;}
      .section-content{font-size:16px;line-height:1.6;}
      
      /* Feature grid */
      .features{display:grid;grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));gap:20px;margin-top:20px;}
      .feature-card{background:#f9f9f9;border-radius:8px;padding:15px;text-align:center;transition:transform 0.3s ease;}
      .feature-card:hover{transform:translateY(-5px);}
      .feature-title{color:#003366;margin:10px 0;font-size:18px;}
      .feature-desc{font-size:14px;color:#666;}
      
      /* CTA section */
      .cta{width:100%;display:flex;justify-content:center;margin:20px 0;}
      .cta-button{display:inline-block;background:#003366;color:white;text-decoration:none;padding:12px 24px;border-radius:5px;font-weight:500;transition:background 0.3s ease;margin:0 10px;}
      .cta-button:hover{background:#002244;}
      
      /* Footer */
      .footer{width:100%;text-align:center;margin-top:20px;padding:20px;font-size:14px;color:#666;}
      
      /* Responsive adjustments */
      @media (max-width:768px){
        .header h1{font-size:20px;}
        .features{grid-template-columns:1fr;}
        .cta{flex-direction:column;align-items:center;}
        .cta-button{margin:10px 0;width:100%;text-align:center;}
      }
      </style>
   <body>
      <div class="container">
        <div class="logo-container">
          <amp-img class="logo" src="${imageSources[3]}" width="150" height="150" layout="intrinsic" alt="ITKessu Logo"></amp-img>
        </div>
        
        <header class="header">
          <h1>${siteName.toUpperCase()} - Institut Teknologi dan Kesehatan Sumatera Utara</h1>
          <p>Portal Layanan Terpadu Kampus Digital</p>
        </header>
        
        <section class="content-section">
          <h2 class="section-title">Tentang ${siteName.toUpperCase()}</h2>
          <div class="section-content">
            <p>${randomDesc}</p>
          </div>
        </section>
        
        <section class="content-section">
          <h2 class="section-title">Fitur Utama</h2>
          <div class="features">
            <div class="feature-card">
              <amp-img src="${imageSources[0]}" width="80" height="80" layout="fixed" alt="Fitur 1"></amp-img>
              <h3 class="feature-title">Akses Cepat</h3>
              <p class="feature-desc">Dapatkan akses cepat ke semua layanan kampus dari satu portal terpadu</p>
            </div>
            <div class="feature-card">
              <amp-img src="${imageSources[1]}" width="80" height="80" layout="fixed" alt="Fitur 2"></amp-img>
              <h3 class="feature-title">Data Terintegrasi</h3>
              <p class="feature-desc">Semua data akademik dan administratif terintegrasi dalam satu sistem</p>
            </div>
            <div class="feature-card">
              <amp-img src="${imageSources[2]}" width="80" height="80" layout="fixed" alt="Fitur 3"></amp-img>
              <h3 class="feature-title">Layanan Digital</h3>
              <p class="feature-desc">Manfaatkan layanan digital untuk mempercepat proses akademik</p>
            </div>
          </div>
        </section>
        
        <div class="cta">
          <a href="${loginUrl}" class="cta-button" target="_blank">MASUK</a>
          <a href="${loginUrl}" class="cta-button" target="_blank">DAFTAR</a>
          <a href="https://itkessu.ac.id/bantuan" class="cta-button" target="_blank">BANTUAN</a>
        </div>
      </div>
      
      <footer class="footer">
        <p>© 2025 Institut Teknologi dan Kesehatan Sumatera Utara - Semua Hak Dilindungi</p>
        <p><a href="https://itkessu.ac.id" title="ITKessu">ITKessu.ac.id</a></p>
      </footer>
   </body>
</html>`;
}
