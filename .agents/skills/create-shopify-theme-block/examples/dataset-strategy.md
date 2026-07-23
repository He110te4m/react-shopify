```html
<script>
  (function () {
    const blocks = document.querySelectorAll('[data-my-block]');
    blocks.forEach((block) => {
      const sectionId = block.dataset.sectionId;
      init(block);

      document.addEventListener('shopify:section:load', (e) => {
        if (e.detail.sectionId !== sectionId) return;
        destroy(block);
        init(block);
      });
      document.addEventListener('shopify:section:unload', (e) => {
        if (e.detail.sectionId !== sectionId) return;
        destroy(block);
      });
    });

    function init(el) { /* ... */ }
    function destroy(el) { /* ... */ }
  })();
</script>
```
