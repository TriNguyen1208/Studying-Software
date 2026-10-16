const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const build = () => {
  console.log("🛠️ Starting Build Process (Static Site Generation)...");

  const contentDir = path.join(__dirname, 'content');
  const distDir = path.join(__dirname, 'dist');
  const srcDir = path.join(__dirname, 'src');
  
  ensureDirectoryExists(distDir);

  const markdownPath = path.join(contentDir, 'article.md');
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  const htmlContent = marked(markdownContent);

  const scriptContent = fs.readFileSync(path.join(srcDir, 'main.js'), 'utf8');

  const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JAMstack Advanced Demo</title>
  <style>
    :root { --primary: #0070f3; --bg: #ffffff; --text: #333333; --border: #eaeaea; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; line-height: 1.6; max-width: 700px; margin: 0 auto; padding: 2rem; color: var(--text); background: var(--bg); }
    h1, h2, h3 { color: #000; }
    main { margin-bottom: 3rem; }
    
    #comments-section { padding-top: 2rem; border-top: 1px solid var(--border); }
    .comment-box { background: #fafafa; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 2rem; }
    .comment-box input, .comment-box textarea { width: 100%; box-sizing: border-box; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; }
    .comment-box button { background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .comment-box button:hover { background: #005bb5; }
    .comment-box button:disabled { background: #ccc; cursor: not-allowed; }
    
    .comment { background: #fff; padding: 1rem 1.5rem; margin-bottom: 1rem; border-radius: 6px; border: 1px solid var(--border); box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .comment strong { display: block; margin-bottom: 0.25rem; font-size: 1.05rem; }
    .comment small { color: #888; font-size: 0.8rem; float: right; }
    .comment p { margin: 0; color: #444; }
    
    .loading { color: #666; font-style: italic; text-align: center; padding: 2rem; }
    .error-msg { color: #e00; background: #fee; padding: 1rem; border-radius: 4px; }
  </style>
</head>
<body>
  <main>
    ${htmlContent}
  </main>

  <div id="comments-section">
    <h2>Bình luận (Dynamic via API)</h2>
    
    <div class="comment-box">
      <h3>Thêm bình luận mới</h3>
      <form id="comment-form">
        <input type="text" id="author" placeholder="Tên của bạn..." required>
        <textarea id="text" rows="3" placeholder="Chia sẻ suy nghĩ của bạn..." required></textarea>
        <button type="submit" id="submit-btn">Gửi bình luận</button>
      </form>
    </div>

    <div id="comments-container">
      <div class="loading">Đang tải bình luận từ Server...</div>
    </div>
  </div>

  <script>
    ${scriptContent}
  </script>
</body>
</html>
  `;

  fs.writeFileSync(path.join(distDir, 'index.html'), finalHtml);
  
  console.log("✅ Build complete! Static file generated at dist/index.html");
};

build();
