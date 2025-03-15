<script lang="ts">
  const currentYear = new Date().getFullYear();
</script>

<footer class="footer">
  <div class="footer-content">
    <!-- Yahoo! JAPAN attribution snippet -->
    <div class="yahoo-attribution">
      <!-- Begin Yahoo! JAPAN Web Services Attribution Snippet -->
      <span style="margin:15px 15px 15px 15px">
        <a href="https://developer.yahoo.co.jp/sitemap/">Webサービス by Yahoo! JAPAN</a>
      </span>
      <!-- End Yahoo! JAPAN Web Services Attribution Snippet -->
    </div>
    
    <!-- Google Maps attribution -->
    <div class="google-attribution">
      <a href="https://maps.google.com/maps?ll=34.6937,135.5023&z=13&t=m&hl=ja">
        © Google
      </a>
    </div>
    
    <div class="copyright">
      © {currentYear} Hack U チーム
    </div>
  </div>
</footer>

<style>
  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(34, 34, 51, 0.9);
    color: #ddd;
    padding: 8px 16px;
    font-size: 12px;
    z-index: 1000;
    display: flex;
    justify-content: center;
    box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.2);
  }

  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1200px;
  }

  .yahoo-attribution a {
    color: #aaa;
    text-decoration: none;
  }

  .yahoo-attribution a:hover {
    color: #fff;
    text-decoration: underline;
  }

  .google-attribution a {
    color: #aaa;
    text-decoration: none;
  }

  .google-attribution a:hover {
    color: #fff;
    text-decoration: underline;
  }

  .copyright {
    color: #888;
  }
</style>
