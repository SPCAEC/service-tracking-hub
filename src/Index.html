<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SPCA Service Tracking Hub</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --accent: #0ea5e9;
      --accent-hover: #0284c7;
      --radius: 16px;
    }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #f9fafb;
      margin: 0;
      padding: 40px;
      color: #111;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 32px;
      text-align: center;
      font-weight: 700;
    }
    section {
      margin-bottom: 80px;
    }
    h2 {
      font-size: 22px;
      margin: 40px 0 24px;
      text-align: center;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 24px;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
    }
    .card {
      display: block;
      background: #fff;
      padding: 24px;
      border-radius: var(--radius);
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      text-decoration: none;
      color: inherit;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .card.disabled {
      opacity: 0.5;
      cursor: default;
      pointer-events: none;
    }
    .card h3 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 18px;
      font-weight: 600;
    }
    .card p {
      margin: 0;
      font-size: 14px;
      color: #444;
    }
  </style>
</head>

<body>
  <h1>SPCA Service Tracking Hub</h1>

  <!-- Pantry Section -->
  <section id="pantry">
    <h2>Pet Food Pantry</h2>
    <div class="grid">
      <a href="..." class="card"><h3>Pantry Order Generator</h3><p>Create and manage Pantry order forms.</p></a>
      <a href="..." class="card"><h3>Order Fulfillment</h3><p>Generate and print pickup labels.</p></a>
      <a href="..." class="card"><h3>Pickup App</h3><p>Mark orders as fulfilled and complete.</p></a>
    </div>
  </section>

  <!-- Scheduling Section -->
  <section id="scheduling">
    <h2>Scheduling</h2>
    <div class="grid" id="schedulingGrid">
      <!-- Dynamic Scheduling cards -->
    </div>
  </section>

  <!-- Medical Section (NEW) -->
  <section id="medical">
    <h2>Medical</h2>
    <div class="grid" id="medicalGrid">
      <!-- Dynamic Medical cards -->
    </div>
  </section>

  <!-- Records Section -->
  <section id="records">
    <h2>Records & Reporting</h2>
    <div class="grid">
      <a href="..." class="card"><h3>Records Upload</h3><p>Submit veterinary or outreach service records.</p></a>
      <a href="..." class="card"><h3>Reports Dashboard</h3><p>Generate activity and service reports.</p></a>
    </div>
  </section>

  <!-- Admin Section -->
  <section id="admin">
    <h2>Admin Tools</h2>
    <div class="grid">
      <a href="..." class="card"><h3>Script Configuration</h3><p>Manage property settings and integrations.</p></a>
      <a href="..." class="card"><h3>Merge Service</h3><p>Access the PDF merge backend.</p></a>
    </div>
  </section>

  <script>
    // ─── Scheduling Apps ──────────────────────────────────────────────
    const schedulingApps = [
      {
        id: 'grantSchedulerCard',
        name: 'Grant Appointment Scheduling',
        desc: 'Use this app to schedule grant-specific appointments with the Lipsey Clinic',
        prop: 'APP_LINK_GRANT_SCHEDULER'
      },
      {
        id: 'schedApp2',
        name: 'App 2',
        desc: 'Reserved for future scheduling tools',
        prop: null
      },
      {
        id: 'schedApp3',
        name: 'App 3',
        desc: 'Reserved for future scheduling tools',
        prop: null
      },
      {
        id: 'schedApp4',
        name: 'App 4',
        desc: 'Reserved for future scheduling tools',
        prop: null
      }
    ];

    const schedulingGrid = document.getElementById('schedulingGrid');

    schedulingApps.forEach(app => {
      const card = document.createElement('div');
      card.id = app.id;
      card.className = 'card disabled';
      card.innerHTML = `<h3>${app.name}</h3><p>${app.desc}</p>`;
      schedulingGrid.appendChild(card);

      if (app.prop) {
        google.script.run
          .withSuccessHandler(link => {
            const el = document.getElementById(app.id);
            if (link) {
              el.outerHTML = `
                <a href="${link}" target="_blank" class="card">
                  <h3>${app.name}</h3>
                  <p>${app.desc}</p>
                </a>`;
            }
          })
          .getAppLink(app.prop);
      }
    });

    // ─── Medical Apps ──────────────────────────────────────────────
    const medicalApps = [
      {
        id: 'medApp1',
        name: 'App 1',
        desc: 'Reserved for future medical services',
        prop: null
      },
      {
        id: 'medApp2',
        name: 'App 2',
        desc: 'Reserved for future medical services',
        prop: null
      },
      {
        id: 'medApp3',
        name: 'App 3',
        desc: 'Reserved for future medical services',
        prop: null
      },
      {
        id: 'lipseyInvoiceCard',
        name: 'Lipsey Invoice Processing',
        desc: 'Upload and process receipts for Lipsey Clinic grant reimbursement tracking',
        prop: 'APP_LINK_LIPSEY_INVOICE'
      }
    ];

    const medicalGrid = document.getElementById('medicalGrid');

    medicalApps.forEach(app => {
      const card = document.createElement('div');
      card.id = app.id;
      card.className = 'card disabled';
      card.innerHTML = `<h3>${app.name}</h3><p>${app.desc}</p>`;
      medicalGrid.appendChild(card);

      if (app.prop) {
        google.script.run
          .withSuccessHandler(link => {
            const el = document.getElementById(app.id);
            if (link) {
              el.outerHTML = `
                <a href="${link}" target="_blank" class="card">
                  <h3>${app.name}</h3>
                  <p>${app.desc}</p>
                </a>`;
            }
          })
          .getAppLink(app.prop);
      }
    });
  </script>
</body>
</html>