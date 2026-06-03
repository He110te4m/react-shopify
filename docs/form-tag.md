---
title: 'Liquid tags: form'
description: >-
  Generates an HTML `<form>` tag, including any required `<input>` tags to
  submit the form to a specific endpoint.
source_url:
  html: 'https://shopify.dev/docs/api/liquid/tags/form'
  md: 'https://shopify.dev/docs/api/liquid/tags/form.md'
api_name: liquid
---

# form

Generates an HTML `<form>` tag, including any required `<input>` tags to submit the form to a specific endpoint.

Because there are many different form types available in Shopify themes, the `form` tag requires a type. Depending on the form type, an additional parameter might be required. You can specify the following form types:

* [`activate_customer_password`](https://shopify.dev/docs/api/liquid/tags/form#form-activate_customer_password)
* [`cart`](https://shopify.dev/docs/api/liquid/tags/form#form-cart)
* [`contact`](https://shopify.dev/docs/api/liquid/tags/form#form-contact)
* [`create_customer`](https://shopify.dev/docs/api/liquid/tags/form#form-create_customer)
* [`currency`](https://shopify.dev/docs/api/liquid/tags/form#form-currency)
* [`customer`](https://shopify.dev/docs/api/liquid/tags/form#form-customer)
* [`customer_address`](https://shopify.dev/docs/api/liquid/tags/form#form-customer_address)
* [`customer_login`](https://shopify.dev/docs/api/liquid/tags/form#form-customer_login)
* [`guest_login`](https://shopify.dev/docs/api/liquid/tags/form#form-guest_login)
* [`localization`](https://shopify.dev/docs/api/liquid/tags/form#form-localization)
* [`new_comment`](https://shopify.dev/docs/api/liquid/tags/form#form-new_comment)
* [`product`](https://shopify.dev/docs/api/liquid/tags/form#form-product)
* [`recover_customer_password`](https://shopify.dev/docs/api/liquid/tags/form#form-recover_customer_password)
* [`reset_customer_password`](https://shopify.dev/docs/api/liquid/tags/form#form-reset_customer_password)
* [`storefront_password`](https://shopify.dev/docs/api/liquid/tags/form#form-storefront_password)

## Syntax

```oobleckTag
{% form 'form_type' %}
  content
{% endform %}
```

### form\_type

The name of the desired form type

### content

The form contents

### activate\_customer\_password

## Syntax

```oobleckTag
{% form 'activate_customer_password', article %}
  form_content
{% endform %}
```

Generates a form for activating a customer account. To learn more about using this form, and its contents, refer to the [`customers/activate_account` template](https://shopify.dev/themes/architecture/templates/customers-activate-account#content).

##### Code

```liquid
{% form 'activate_customer_password' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account/activate" accept-charset="UTF-8"><input type="hidden" name="form_type" value="activate_customer_password" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### cart

## Syntax

```oobleckTag
{% form 'cart', cart %}
  form_content
{% endform %}
```

Generates a form for creating a checkout based on the items currently in the cart. The `cart` form requires a [`cart` object](https://shopify.dev/docs/api/liquid/objects/cart) as a parameter. To learn more about using the cart form in your theme, refer to the [`cart` template](https://shopify.dev/themes/architecture/templates/cart#proceed-to-checkout).

##### Code

```liquid
{% form 'cart', cart %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/cart" id="cart_form" accept-charset="UTF-8" class="shopify-cart-form" enctype="multipart/form-data"><input type="hidden" name="form_type" value="cart" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### contact

## Syntax

```oobleckTag
{% form 'contact' %}
  form_content
{% endform %}
```

Generates a form for submitting an email to the merchant. To learn more about using this form in your theme, refer to [Add a contact form to your theme](https://shopify.dev/themes/customer-engagement/add-contact-form).

***

**Tip:** To learn more about the merchant experience of receiving submissions, refer to \<a href="https://help.shopify.com/manual/online-store/themes/customizing-themes/add-contact-page#view-contact-form-submissions">the Shopify Help Center\</a>.

***

##### Code

```liquid
{% form 'contact' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/contact#contact_form" id="contact_form" accept-charset="UTF-8" class="contact-form"><input type="hidden" name="form_type" value="contact" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### create\_customer

## Syntax

```oobleckTag
{% form 'create_customer' %}
  form_content
{% endform %}
```

Generates a form for creating a new customer account. To learn more about using this form, and its contents, refer to the [`customers/register` template](https://shopify.dev/themes/architecture/templates/customers-register#content).

##### Code

```liquid
{% form 'create_customer' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account" id="create_customer" accept-charset="UTF-8" data-login-with-shop-sign-up="true"><input type="hidden" name="form_type" value="create_customer" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### currency

## Syntax

```oobleckTag
{% form 'currency' %}
  form_content
{% endform %}
```

***

**Deprecated:** The \<code>currency\</code> form is deprecated and has been replaced by the \<a href="/docs/api/liquid/tags/form#form-localization">\<code>localization\</code> form\</a>.

***

Generates a form for customers to select their preferred currency.

***

**Tip:** Use the \<a href="/docs/api/liquid/filters/currency\_selector">\<code>\<span class="PreventFireFoxApplyingGapToWBR">currency\<wbr/>\_selector\</span>\</code> filter\</a> to include a currency selector inside the form.

***

##### Code

```liquid
{% form 'currency' %}
  {{ form | currency_selector }}
{% endform %}
```

##### Output

```html
<form method="post" action="/cart/update" id="currency_form" accept-charset="UTF-8" class="shopify-currency-form" enctype="multipart/form-data"><input type="hidden" name="form_type" value="currency" /><input type="hidden" name="utf8" value="✓" /><input type="hidden" name="return_to" value="/services/liquid_rendering/resource" />
  <select name="currency"><option value="AED">AED د.إ</option><option value="AFN">AFN ؋</option><option value="AUD">AUD $</option><option value="CAD" selected="selected">CAD $</option><option value="CHF">CHF CHF</option><option value="CZK">CZK Kč</option><option value="DKK">DKK kr.</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option><option value="HKD">HKD $</option><option value="ILS">ILS ₪</option><option value="JPY">JPY ¥</option><option value="KRW">KRW ₩</option><option value="MYR">MYR RM</option><option value="NZD">NZD $</option><option value="PLN">PLN zł</option><option value="SEK">SEK kr</option><option value="SGD">SGD $</option><option value="USD">USD $</option></select>
</form>
```

### customer

## Syntax

```oobleckTag
{% form 'customer' %}
  form_content
{% endform %}
```

Generates a form for creating a new customer without registering a new account. This form is useful for collecting customer information when you don't want customers to log in to your store, such as building a list of emails from a newsletter signup.

***

**Tip:** To generate a form that registers a customer account, use the \<a href="/docs/api/liquid/tags/form#form-create\_customer">\<code>\<span class="PreventFireFoxApplyingGapToWBR">create\<wbr/>\_customer\</span>\</code> form\</a>.

***

To learn more about using this form, and its contents, refer to [Email consent](https://shopify.dev/themes/customer-engagement/email-consent#newsletter-sign-up-form).

##### Code

```liquid
{% form 'customer' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/contact#contact_form" id="contact_form" accept-charset="UTF-8" class="contact-form"><input type="hidden" name="form_type" value="customer" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### customer\_address

## Syntax

```oobleckTag
{% form 'customer_address', address_type %}
  form_content
{% endform %}
```

Generates a form for creating a new address on a customer account, or editing an existing one. The `customer_address` form requires a specific parameter, depending on whether a new address is being created or an existing one is being edited:

| Parameter value | Use-case |
| - | - |
| `customer.new_address` | When a new address is being created. |
| `address` | When an existing address is being edited. |

To learn more about using this form, and its contents, refer to the [`customers/addresses` template](https://shopify.dev/themes/architecture/templates/customers-addresses#content).

##### Code

```liquid
{% form 'customer_address', customer.new_address %}
  <!-- form content -->
{% endform %}
```

##### Data

```json
{
  "customer": {
    "new_address": {}
  }
}
```

##### Output

```html
<form method="post" action="/account/addresses" id="address_form_new" accept-charset="UTF-8"><input type="hidden" name="form_type" value="customer_address" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### customer\_login

## Syntax

```oobleckTag
{% form 'customer_login' %}
  form_content
{% endform %}
```

Generates a form for logging into a customer account. To learn more about using this form, and its contents, refer to the [`customers/login` template](https://shopify.dev/themes/architecture/templates/customers-login#the-customer-login-form).

##### Code

```liquid
{% form 'customer_login' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account/login" id="customer_login" accept-charset="UTF-8" data-login-with-shop-sign-in="true"><input type="hidden" name="form_type" value="customer_login" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### guest\_login

## Syntax

```oobleckTag
{% form 'guest_login' %}
  form_content
{% endform %}
```

Generates a form, for use in the [`customers/login` template](https://shopify.dev/themes/architecture/templates/customers-login), that directs customers back to their checkout session as a guest instead of logging in to an account. To learn more about using this form, and its contents, refer to [Offer guest checkout](https://shopify.dev/themes/architecture/templates/customers-login#offer-guest-checkout).

##### Code

```liquid
{% form 'guest_login' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account/login" id="customer_login_guest" accept-charset="UTF-8"><input type="hidden" name="form_type" value="guest_login" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
<input type="hidden" name="guest" value="true" /></form>
```

### localization

## Syntax

```oobleckTag
{% form 'localization' %}
  form_content
{% endform %}
```

Generates a form for customers to select their preferred country so that they're shown the appropriate language and currency. The `localization` form can contain one of two selectors:

* A country selector
* A language selector

***

**Note:** The \<code>localization\</code> form replaces the deprecated \<a href="/docs/api/liquid/tags/form#form-currency">\<code>currency\</code> form\</a>.

***

To learn more about using this form, and its contents, refer to [Support multiple currencies and languages](https://shopify.dev/themes/internationalization/multiple-currencies-languages).

##### Code

```liquid
{% form 'localization' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/localization" id="localization_form" accept-charset="UTF-8" class="shopify-localization-form" enctype="multipart/form-data"><input type="hidden" name="form_type" value="localization" /><input type="hidden" name="utf8" value="✓" /><input type="hidden" name="_method" value="put" /><input type="hidden" name="return_to" value="/services/liquid_rendering/resource" />
  <!-- form content -->
</form>
```

### new\_comment

## Syntax

```oobleckTag
{% form 'new_comment', article %}
  form_content
{% endform %}
```

Generates a form for creating a new comment on an article. The `new_comment` form requires an [`article` object](https://shopify.dev/docs/api/liquid/objects/article) as a parameter. To learn more about using this form, and its contents, refer to the [`article` template](https://shopify.dev/themes/architecture/templates/article#the-comment-form).

##### Code

```liquid
{% form 'new_comment', article %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/blogs/potion-notions/how-to-tell-if-you-have-run-out-of-invisibility-potion/comments#comment_form" id="comment_form" accept-charset="UTF-8" class="comment-form"><input type="hidden" name="form_type" value="new_comment" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### product

## Syntax

```oobleckTag
{% form 'product', product %}
  form_content
{% endform %}
```

Generates a form for adding a product variant to the cart. The `product` form requires a [`product` object](https://shopify.dev/docs/api/liquid/objects/product) as a parameter. To learn more about using this form, and its contents, refer to the [`product` template](https://shopify.dev/themes/architecture/templates/product#the-product-form).

##### Code

```liquid
{% form 'product', product %}
  <!-- form content -->
{% endform %}
```

##### Data

```json
{
  "product": {
    "id": 6786188247105
  }
}
```

##### Output

```html
<form method="post" action="/cart/add" id="product_form_6786188247105" accept-charset="UTF-8" class="shopify-product-form" enctype="multipart/form-data"><input type="hidden" name="form_type" value="product" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
<input type="hidden" name="product-id" value="6786188247105" /></form>
```

### recover\_customer\_password

## Syntax

```oobleckTag
{% form 'recover_customer_password' %}
  form_content
{% endform %}
```

Generates a form, for use in the [`customers/login` template](https://shopify.dev/themes/architecture/templates/customers-login), for a customer to recover a lost or forgotten password. To learn more about using this form, and its contents, refer to [Provide a "Forgot your password" option](https://shopify.dev/themes/architecture/templates/customers-login#provide-a-forgot-your-password-option).

##### Code

```liquid
{% form 'recover_customer_password' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account/recover" accept-charset="UTF-8"><input type="hidden" name="form_type" value="recover_customer_password" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### reset\_customer\_password

## Syntax

```oobleckTag
{% form 'reset_customer_password' %}
  form_content
{% endform %}
```

Generates a form for a customer to reset their password. To learn more about using this form, and its contents, refer to the [`customers/reset_password` template](https://shopify.dev/themes/architecture/templates/customers-reset-password#content).

##### Code

```liquid
{% form 'reset_customer_password' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/account/reset" accept-charset="UTF-8"><input type="hidden" name="form_type" value="reset_customer_password" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

### storefront\_password

## Syntax

```oobleckTag
{% form 'storefront_password' %}
  form_content
{% endform %}
```

Generates a form for entering a password protected storefront. To learn more about using this form, and its contents, refer to the [`password` template](https://shopify.dev/themes/architecture/templates/password#the-password-form).

##### Code

```liquid
{% form 'storefront_password' %}
  <!-- form content -->
{% endform %}
```

##### Output

```html
<form method="post" action="/password" id="login_form" accept-charset="UTF-8" class="storefront-password-form"><input type="hidden" name="form_type" value="storefront_password" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
</form>
```

## form tag parameters

### return\_to

## Syntax

```oobleckTag
{% form 'form_type', return_to: string %}
  content
{% endform %}
```

By default, each form type redirects customers to a specific page after the form submits. For example, the `product` form redirects to the cart page.

The `return_to` parameter allows you to specify a URL to redirect to. This can be done with the following values:

| Value | Description |
| - | - |
| `back` | Redirect back to the same page that the customer was on before submitting the form. |
| A relative path | A specific URL path. For example `/collections/all`. |
| A [`routes` attribute](https://shopify.dev/docs/api/liquid/objects/routes) | For example, `routes.root_url` |

##### Code

```liquid
{% form 'customer_login', return_to: routes.root_url %}
  <!-- form content -->
{% endform %}
```

##### Data

```json
{
  "routes": {
    "root_url": "/"
  }
}
```

##### Output

```html
<form method="post" action="/account/login" id="customer_login" accept-charset="UTF-8" data-login-with-shop-sign-in="true"><input type="hidden" name="form_type" value="customer_login" /><input type="hidden" name="utf8" value="✓" /><input type="hidden" name="return_to" value="/" />
  <!-- form content -->
</form>
```

### HTML attributes

## Syntax

```oobleckTag
{% form 'form_type', attribute: string %}
  content
{% endform %}
```

You can specify [HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attributes) by adding a parameter that matches the attribute name with `data-` prepended, and the desired value.

##### Code

```liquid
{% form "product", product, id: 'custom-id', class: 'custom-class', data-example: '100' %}
  <!-- form content -->
{% endform %}
```

##### Data

```json
{
  "product": {
    "id": 6786188247105
  }
}
```

##### Output

```html
<form method="post" action="/cart/add" id="custom-id" accept-charset="UTF-8" class="custom-class" enctype="multipart/form-data" data-example="100"><input type="hidden" name="form_type" value="product" /><input type="hidden" name="utf8" value="✓" />
  <!-- form content -->
<input type="hidden" name="product-id" value="6786188247105" /></form>
```
