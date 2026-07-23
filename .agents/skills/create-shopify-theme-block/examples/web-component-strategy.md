HTML root element:
```liquid
<my-block id="{{ el_id }}" data-section-id="{{ section.id }}" {{ block.shopify_attributes }}>
```

JavaScript:
```html
<script>
  class MyBlock extends HTMLElement {
    connectedCallback() {
      // shopify:section:load also fires on initial load (after connectedCallback).
      // init() calls destroy() first, so double-call is safe.
      this.init();
    }

    disconnectedCallback() {
      this.destroy();
    }

    init() {
      this.destroy();
      this._onSectionLoad = (e) => {
        if (e.detail.sectionId !== this.dataset.sectionId) return;
        this.init();
      };
      this._onSectionUnload = (e) => {
        if (e.detail.sectionId !== this.dataset.sectionId) return;
        this.destroy();
      };
      document.addEventListener('shopify:section:load', this._onSectionLoad);
      document.addEventListener('shopify:section:unload', this._onSectionUnload);
      // ... initialization logic here
    }

    destroy() {
      if (this._onSectionLoad) {
        document.removeEventListener('shopify:section:load', this._onSectionLoad);
        document.removeEventListener('shopify:section:unload', this._onSectionUnload);
        delete this._onSectionLoad;
        delete this._onSectionUnload;
      }
      // ... cleanup: clear timers, disconnect observers, remove inline listeners
    }
  }

  if (!customElements.get('my-block')) {
    customElements.define('my-block', MyBlock);
  }
</script>
```
