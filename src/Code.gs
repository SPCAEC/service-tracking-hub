<script>
/**
 * Pantry Client screen controller
 * - Uses API.* wrappers (with failure handlers)
 * - Adds console taps + an always-on "Raw response" diagnostic block
 * - Avoids duplicate helpers, cleans up event wiring
 */
(function () {
  const $ = (id) => document.getElementById(id);

  // ---------- Event wiring ----------
  document.addEventListener('DOMContentLoaded', () => {
    $('btnSearch')?.addEventListener('click', search);
    $('btnReset')?.addEventListener('click', reset);
  });

  function reset() {
    ['inpClientId', 'inpPhone', 'inpEmail', 'inpFormId'].forEach((id) => {
      const el = $(id);
      if (el) el.value = '';
    });
    const R = $('result');
    if (R) R.innerHTML = '';
  }

  // ---------- Actions ----------
  function search() {
    const q = {
      clientId: ($('inpClientId')?.value || '').trim(),
      phone: ($('inpPhone')?.value || '').trim(),
      email: ($('inpEmail')?.value || '').trim(),
    };
    const formId = ($('inpFormId')?.value || '').trim();

    if (formId) {
      API.searchByFormId(formId, (res) => {
        console.log('[searchByFormId] RES =', res);
        render(res);
      });
    } else {
      API.searchClient(q, (res) => {
        console.log('[searchClient] RES =', res);
        render(res);
      });
    }
  }

  function render(res) {
    const R = $('result');
    if (!R) return;

    // 🔎 Always show what came back, even if it's undefined/null
    const diag = {
      receivedAt: new Date().toISOString(),
      typeof: typeof res,
      isNull: res === null,
      isUndefined: typeof res === 'undefined',
      keys: res && typeof res === 'object' ? Object.keys(res) : [],
      value: res,
    };
    R.innerHTML = `
      <div class="card" style="border-color:#94a3b8;">
        <h3 style="margin:0 0 .5rem;">Raw response</h3>
        <pre style="white-space:pre-wrap;">${escape(JSON.stringify(diag, null, 2))}</pre>
      </div>
    `;

    // If it's undefined/null, bail after showing diagnostics
    if (res == null) return;

    // Server error payload (from Code.gs wrappers)
    if (res.status === 'error') {
      R.innerHTML += `
        <div class="card" style="border-color:#ef4444;">
          <h3 style="margin:0 0 .5rem;">Server error ${res.where ? '(' + res.where + ')' : ''}</h3>
          <pre style="white-space:pre-wrap;">${escape(res.message || '')}</pre>
        </div>`;
      return;
    }

    // Normal success cases
    if (res.status === 'exact' && res.client) {
      R.innerHTML += cardExisting(res.client, { title: 'Client Found' });
      return;
    }

    if (res.status === 'possible_duplicate') {
      R.innerHTML += cardPossibleDup(res);
      return;
    }

    if (res.status === 'new_from_form') {
      R.innerHTML += cardCreate(res.candidateFromForm || {});
      return;
    }

    if (res.status === 'not_found' || res.status === 'form_not_found') {
      R.innerHTML += cardCreate({});
      return;
    }

    // Fallback: show the payload
    R.innerHTML += `<pre>${escape(JSON.stringify(res, null, 2))}</pre>`;
  }

  // ---------- UI builders ----------
  function cardExisting(c, opts) {
    return `
      <div class="card">
        <h3 style="margin:0 0 .5rem;">${(opts && opts.title) || 'Client'}</h3>
        ${tableFields(c)}
        <div style="margin-top:.75rem; display:flex; gap:.5rem; flex-wrap: wrap;">
          <button type="button" onclick="UI_PC.editExisting()">Edit</button>
          <button type="button" onclick="UI_PC.continue()">Continue</button>
        </div>
      </div>
    `;
  }

  function cardPossibleDup(res) {
    const left = res.client || {};
    const right = res.candidateFromForm || {};
    const reasons = Array.isArray(res.matchReasons) ? res.matchReasons.join(' + ') : '';
    return `
      <div class="card">
        <h3 style="margin:0 0 .5rem;">Possible duplicate ${reasons ? '(' + reasons + ')' : ''}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div><h4 style="margin:.25rem 0;">Existing</h4>${tableFields(left)}</div>
          <div><h4 style="margin:.25rem 0;">From Form</h4>${tableFields(right)}</div>
        </div>
        <div style="margin-top:.75rem; display:flex; gap:.5rem; flex-wrap: wrap;">
          <button type="button" onclick="UI_PC.useExisting()">Use Existing</button>
          <button type="button" onclick="UI_PC.merge()">Merge & Save</button>
          <button type="button" class="secondary" onclick="UI_PC.createFromForm()">Create Separate Client</button>
        </div>
      </div>
    `;
  }

  function cardCreate(seed) {
    // Minimal create form; First/Last required
    const fields = [
      'ClientID', 'FirstName', 'LastName', 'Address1', 'Address2', 'City', 'State', 'ZIP',
      'Phone', 'PhoneNormalized', 'Email', 'EmailNormalized',
      'PreferredContact', 'ConsentEmail', 'ConsentSMS', 'Returning Client',
      'FirstSeenAt', 'FirstSeenSource',
      'How did you hear about us?', 'Language', 'Military Status', 'Employment', 'Ethnic Background',
      'Transportation', 'Gender Identity', 'Public Services', 'Income', 'Income Contribution',
      'Household Size', 'Housing Status',
    ];
    const init = {};
    fields.forEach((k) => (init[k] = seed[k] || ''));

    return `
      <div class="card">
        <h3 style="margin:0 0 .5rem;">${seed && (seed.FirstName || seed.LastName) ? 'Review or Create Client' : 'Create New Client'}</h3>
        <form id="formClient" onsubmit="return false;">
          <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));">
            ${fields
              .map((k) => {
                const required = k === 'FirstName' || k === 'LastName' ? 'required' : '';
                const val = escape(init[k]);
                return `
                  <div class="field">
                    <label>${k}${required ? ' *' : ''}</label>
                    <input name="${k}" value="${val}" ${required} />
                  </div>
                `;
              })
              .join('')}
          </div>
        </form>
        <div style="margin-top:.75rem;">
          <button type="button" onclick="UI_PC.saveNew()">Create Client</button>
        </div>
      </div>
    `;
  }

  function tableFields(c) {
    const fields = [
      'ClientID', 'FirstName', 'LastName', 'Address1', 'Address2', 'City', 'State', 'ZIP',
      'Phone', 'PhoneNormalized', 'Email', 'EmailNormalized',
      'PreferredContact', 'ConsentEmail', 'ConsentSMS', 'Returning Client',
      'FirstSeenAt', 'FirstSeenSource',
      'How did you hear about us?', 'Language', 'Military Status', 'Employment', 'Ethnic Background',
      'Transportation', 'Gender Identity', 'Public Services', 'Income', 'Income Contribution',
      'Household Size', 'Housing Status',
    ];
    const val = (k) => (c && c[k] != null ? String(c[k]) : '');
    return `
      <table style="width:100%; border-collapse:collapse;">
        <tbody>
          ${fields
            .map(
              (k) => `
            <tr>
              <td style="padding:.25rem .5rem; color:#475569; width:240px;">${k}</td>
              <td style="padding:.25rem .5rem;">${escape(val(k))}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  // ---------- Exposed actions for buttons ----------
  window.UI_PC = {
    editExisting() {
      const R = $('result');
      const read = R?.querySelector('table');
      if (!read) {
        APP.toast('Nothing to edit.');
        return;
      }
      const data = tableToObject(read);
      R.innerHTML =
        cardCreate(data).replace('Create New Client', 'Edit Client') +
        `<div style="margin-top:.5rem;">
           <button type="button" onclick="UI_PC.saveEdit()">Save</button>
         </div>`;
    },

    saveEdit() {
      const data = formToObject('formClient');
      normalizeClient(data);
      API.createClient(data, () => {
        APP.toast('Client updated.');
        reset();
      });
    },

    saveNew() {
      const data = formToObject('formClient');
      if (!data.FirstName || !data.LastName) {
        APP.toast('First and Last Name are required.');
        return;
      }
      normalizeClient(data);
      API.createClient(data, () => {
        APP.toast('Client created.');
        reset();
      });
    },

    continue() {
      APP.toast('Continue to Pets (coming next)…');
      // APP.nav.to('pantry_pets');
    },

    useExisting() {
      APP.toast('Using existing client. Continue to Pets…');
    },

    merge() {
      const R = $('result');
      const blocks = R?.querySelectorAll('table');
      if (!blocks || blocks.length < 2) {
        APP.toast('No merge candidates.');
        return;
      }
      const existing = tableToObject(blocks[0]);
      const fromForm = tableToObject(blocks[1]);

      google.script.run
        .withSuccessHandler((merged) => {
          API.createClient(merged, () => {
            APP.toast('Merged & saved.');
            reset();
          });
        })
        .api_mergeClientWithForm(existing, fromForm); // call service helper directly
    },

    createFromForm() {
      const R = $('result');
      const blocks = R?.querySelectorAll('table');
      if (!blocks || blocks.length < 2) {
        APP.toast('No form candidate.');
        return;
      }
      const fromForm = tableToObject(blocks[1]);
      normalizeClient(fromForm);
      API.createClient(fromForm, () => {
        APP.toast('Client created from form.');
        reset();
      });
    },
  };

  // ---------- Helpers ----------
  function formToObject(formId) {
    const o = {};
    document.querySelectorAll(`#${formId} input`).forEach((i) => (o[i.name] = i.value || ''));
    return o;
  }

  function tableToObject(tbl) {
    const o = {};
    tbl.querySelectorAll('tr').forEach((tr) => {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 2) {
        const key = tds[0].textContent.trim();
        const val = tds[1].textContent;
        o[key] = val;
      }
    });
    return o;
  }

  function normalizeClient(o) {
    if (o.Email && !o.EmailNormalized) o.EmailNormalized = o.Email.toLowerCase();
    if (o.Phone && !o.PhoneNormalized) {
      const digits = String(o.Phone).replace(/\D/g, '');
      o.PhoneNormalized = digits.length >= 10 ? digits.slice(-10) : digits;
    }
  }

  function escape(s) {
    return String(s || '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }
})();
</script>