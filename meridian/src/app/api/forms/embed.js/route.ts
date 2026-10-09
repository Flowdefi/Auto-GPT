import { NextResponse } from "next/server";
import { publicBaseUrl } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Drop-in capture script for www.debtmarket.net. Any form carrying
 * `data-meridian-form` posts to Meridian instead of the page's own handler.
 *
 *   <script src="https://app.debtmarket.net/api/forms/embed.js" defer></script>
 *   <form data-meridian-form="seller-inquiry" data-meridian-workspace="triton"> … </form>
 */
export function GET() {
  const base = publicBaseUrl();
  const script = `(function () {
  "use strict";
  var ENDPOINT = ${JSON.stringify(`${base}/api/forms/submit`)};
  var RENDERED_AT = Date.now();

  function honeypot(form) {
    if (form.querySelector('[name="company_website"]')) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = "position:absolute;left:-9999px;height:0;overflow:hidden";
    var input = document.createElement("input");
    input.type = "text";
    input.name = "company_website";
    input.tabIndex = -1;
    input.autocomplete = "off";
    wrap.appendChild(input);
    form.appendChild(wrap);
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (typeof value === "string") data[key] = value;
    });
    data.formId = form.getAttribute("data-meridian-form") || "website-contact";
    data.workspace = form.getAttribute("data-meridian-workspace") || "triton";
    data.source = form.getAttribute("data-meridian-source") || "website:" + data.formId;
    data.pageUrl = window.location.href;
    data.renderedAt = String(RENDERED_AT);

    var params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"].forEach(function (key) {
      var found = params.get(key);
      if (found) data[key] = found;
    });
    if (document.referrer) data.referrer = document.referrer;
    return data;
  }

  function status(form, message, ok) {
    var node = form.querySelector("[data-meridian-status]");
    if (!node) {
      node = document.createElement("p");
      node.setAttribute("data-meridian-status", "");
      form.appendChild(node);
    }
    node.textContent = message;
    node.style.color = ok ? "#1a7f5a" : "#b42318";
  }

  function submit(event) {
    var form = event.target;
    if (!form.hasAttribute("data-meridian-form")) return;
    event.preventDefault();

    var button = form.querySelector('[type="submit"]');
    var original = button ? button.textContent : null;
    if (button) {
      button.disabled = true;
      button.textContent = "Sending…";
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collect(form))
    })
      .then(function (response) {
        return response.json().then(function (payload) {
          return { ok: response.ok, payload: payload };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.payload.error || "Submission failed");
        var redirect = form.getAttribute("data-meridian-redirect");
        if (redirect) {
          window.location.href = redirect;
          return;
        }
        form.reset();
        status(form, form.getAttribute("data-meridian-success") || "Thank you — our desk will reply shortly.", true);
      })
      .catch(function (error) {
        status(form, error.message || "Something went wrong. Email portfolios@debtmarket.net.", false);
      })
      .finally(function () {
        if (button) {
          button.disabled = false;
          button.textContent = original;
        }
      });
  }

  function init() {
    var forms = document.querySelectorAll("form[data-meridian-form]");
    for (var i = 0; i < forms.length; i++) honeypot(forms[i]);
    document.addEventListener("submit", submit, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
