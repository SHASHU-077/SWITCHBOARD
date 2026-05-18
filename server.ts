import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request Logger
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} [SERVER] ${req.method} ${req.url}`);
    next();
  });

  const masterAuth = (req: express.Request, res: express.Response, next: express.NextFunction, type: 'sentinel' | 'gsm' | 'registry') => {
    const sentinelId = process.env.SENTINEL_MANAGEMENT_ID || 'Moses Masolo Mukubali';
    const sentinelKey = process.env.SENTINEL_MANAGEMENT_KEY || 'Mama1989Netty';
    
    const providedKey = req.headers['x-registry-key'] || req.headers['x-sentinel-key'] || req.headers['x-gsm-key'];
    const providedId = req.headers['x-sentinel-id'];

    // Check Master Sentinel Override
    if (providedId === sentinelId && providedKey === sentinelKey) {
      return next();
    }

    // Check specific keys
    let specificKey: string | undefined;
    if (type === 'sentinel') specificKey = process.env.ASTERISK_SENTINEL_PASSWORD || '#Pamoja*musa@1989.27312151';
    if (type === 'gsm') specificKey = process.env.GSM_SENTINEL_PASSWORD || 'Pamoja.musa@1989/0791242243';
    if (type === 'registry') specificKey = process.env.REGISTRY_PASSWORD || '07/08/1989.0791242243';

    if (providedKey && providedKey === specificKey) {
      return next();
    }

    console.warn(`[AUTH_FAILURE] Unauthorized access attempt to ${req.url} from ${req.ip} [Type: ${type}]`);
    res.status(401).json({ error: `Access Denied: Invalid ${type.toUpperCase()} Protocol` });
  };

  const sentinelAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => masterAuth(req, res, next, 'sentinel');
  const gsmAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => masterAuth(req, res, next, 'gsm');
  const registryAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => masterAuth(req, res, next, 'registry');

  const verifySentinel = (id?: string, key?: string, password?: string) => {
    const sentinelId = process.env.SENTINEL_MANAGEMENT_ID || 'Moses Masolo Mukubali';
    const sentinelKey = process.env.SENTINEL_MANAGEMENT_KEY || 'Mama1989Netty';
    const asteriskPass = process.env.ASTERISK_SENTINEL_PASSWORD || '#Pamoja*musa@1989.27312151';

    if (id === sentinelId && key === sentinelKey) return true;
    if (password === asteriskPass || key === asteriskPass) return true;
    return false;
  };

  const verifyGSM = (id?: string, key?: string, password?: string) => {
    const sentinelId = process.env.SENTINEL_MANAGEMENT_ID || 'Moses Masolo Mukubali';
    const sentinelKey = process.env.SENTINEL_MANAGEMENT_KEY || 'Mama1989Netty';
    const gsmPass = process.env.GSM_SENTINEL_PASSWORD || 'Pamoja.musa@1989/0791242243';

    if (id === sentinelId && key === sentinelKey) return true;
    if (password === gsmPass || key === gsmPass) return true;
    return false;
  };

  const verifyRegistry = (id?: string, key?: string, password?: string) => {
    const sentinelId = process.env.SENTINEL_MANAGEMENT_ID || 'Moses Masolo Mukubali';
    const sentinelKey = process.env.SENTINEL_MANAGEMENT_KEY || 'Mama1989Netty';
    const registryPass = process.env.REGISTRY_PASSWORD || '07/08/1989.0791242243';

    if (id === sentinelId && key === sentinelKey) return true;
    if (password === registryPass || key === registryPass) return true;
    return false;
  };

  app.post('/api/sentinel/management-verify', (req, res) => {
    const { id, key } = req.body;
    if (verifySentinel(id, key)) return res.json({ success: true });
    res.status(401).json({ success: false, error: 'Sentinel Identity Mismatch' });
  });

  app.post('/api/sentinel/verify', (req, res) => {
    const { id, key, password } = req.body;
    if (verifySentinel(id, key, password)) return res.json({ success: true });
    res.status(401).json({ success: false, error: 'Invalid Sentinel Key' });
  });

  app.post('/api/gsm/verify', (req, res) => {
    const { id, key, password } = req.body;
    if (verifyGSM(id, key, password)) return res.json({ success: true });
    res.status(401).json({ success: false, error: 'Invalid GSM Key' });
  });

  app.post('/api/registry/verify', (req, res) => {
    const { id, key, password } = req.body;
    if (verifyRegistry(id, key, password)) return res.json({ success: true });
    res.status(401).json({ success: false, error: 'Invalid Registry Access Key' });
  });

  // --- Organization Registry Store ---
  let organizations: any[] = [];

  app.get('/api/registry/organizations', registryAuth, (req, res) => {
    res.json(organizations);
  });

  app.post('/api/registry/register', registryAuth, (req, res) => {
    const org = req.body;
    const now = new Date();
    
    // Auto-check if the organization is within valid date range
    const startDate = new Date(org.startDate);
    const endDate = new Date(org.endDate);
    const isActive = now >= startDate && now <= endDate;

    const newOrg = {
      ...org,
      id: `ORG-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      registeredAt: now.toISOString(),
      status: isActive ? 'active' : (now < startDate ? 'pending' : 'expired')
    };

    organizations.push(newOrg);
    res.json({ success: true, organization: newOrg });
  });

  app.post('/api/registry/update-status', registryAuth, (req, res) => {
    const { orgId, status } = req.body;
    organizations = organizations.map(org => 
      org.id === orgId ? { ...org, status } : org
    );
    res.json({ success: true });
  });

  app.get('/api/registry/check-agent/:contact', (req, res) => {
    const { contact } = req.params;
    const now = new Date();
    
    // Find organization that owns this contact
    const org = organizations.find(o => 
      (o.gsmContact === contact || (o.virtualContact && o.virtualContact === contact)) &&
      now >= new Date(o.startDate) &&
      now <= new Date(o.endDate)
    );

    if (org) {
      // If found in registry, direct calls are stopped
      // We return redirection details
      return res.json({ 
        blocked: true, 
        reason: 'Autonomous Protocol Active',
        redirectedTo: org.virtualContact || org.gsmContact,
        orgName: org.name,
        prefix: org.prefix
      });
    }

    res.json({ blocked: false });
  });

  // --- Independent Asterisk Engine (PBX) Simulation ---
  const sipTrunks = [
    { id: 'T_AFR_01', provider: 'Pamoja Grid-Safaricom', status: 'registered', host: 'grid-pgw.safaricom.co.ke', channels: '125,000,000', latency: '0.1ms', efficiency: '99.99%', cps: '50,000,000' },
    { id: 'T_AFR_02', provider: 'Pamoja Grid-Airtel', status: 'registered', host: 'grid-ts.airtel.africa', channels: '75,000,000', latency: '0.2ms', efficiency: '99.98%', cps: '35,000,000' },
    { id: 'T_GLO_01', provider: 'Pamoja Global-Backbone', host: 'backbone-1.pamoja.africa', status: 'registered', latency: '2ms', channels: '500,000,000', efficiency: '100%', cps: '150,000,000' }
  ];

  const asteriskState = {
    uptime: '15d 4h 22m',
    activeChannels: 700000000,
    totalCallsToday: 85200000000,
    version: 'Asterisk 21.0.1 (Pamoja Grid Engine)',
    sipTrunks,
    queues: [
      { name: 'Priority Support Grid', strategy: 'roundrobin-elastic', agents: 1200000, waiting: 0 },
      { name: 'Sales Hyper-Queue', strategy: 'leastrecent-elastic', agents: 850000, waiting: 0 },
      { name: 'VIP_Escalation', strategy: 'ringall', agents: 400000, waiting: 0 }
    ]
  };

  // API Routes
  app.get('/api/pbx/status', sentinelAuth, (req, res) => {
    // Dynamically jitter the active channels to simulate hyper-load
    const loadJitter = Math.floor(Math.random() * 500000) - 250000;
    res.json({
      ...asteriskState,
      activeChannels: asteriskState.activeChannels + loadJitter
    });
  });

  app.get('/api/pbx/trunks', sentinelAuth, (req, res) => {
    res.json({ trunks: sipTrunks });
  });

  app.post('/api/pbx/trunk-refresh', sentinelAuth, (req, res) => {
    const { trunkId } = req.body;
    console.log(`[PBX] Refreshing SIP registration for ${trunkId}`);
    res.json({ success: true, message: `Trunk ${trunkId} re-registered successfully.` });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mock Support Routing Rules
  const supportRoutes: Record<string, string[]> = {
    '+254207373737': ['+254791242243', '+254114104647'],
    '+254203737373': ['+254791242243', '+254114104647']
  };

  // Mock Call Initiation for agents dialing *number#
  app.post('/api/calls/initiate', (req, res) => {
    const { agentId, targetNumber, virtualNumber, organizationId } = req.body;
    
    // Check for support routing
    const isSupportCall = supportRoutes[targetNumber];
    const finalTarget = isSupportCall ? isSupportCall[0] : targetNumber;

    // SCALABILITY: In production, this would be handled by a distributed cluster 
    // of Node.js workers and a Redis-backed queue to handle 1B+ concurrent requests.
    console.log(`[Switchboard][Org:${organizationId || 'Global'}] Routing call to ${finalTarget}`);
    
    res.json({
      success: true,
      callId: `call_${Math.random().toString(36).substr(2, 9)}`,
      status: 'routing',
      masked: true,
      routingPath: isSupportCall ? 'Support Internet Termination' : 'Standard Internet Termination'
    });
  });

  // Mock Organization Registration
  app.post('/api/organizations/register', (req, res) => {
    const { name, regNumber, certificate, selectedNumbers } = req.body;
    res.json({
      success: true,
      orgId: `org_${Math.random().toString(36).substr(2, 5)}`,
      status: 'pending_verification',
      selectedNumbers: selectedNumbers || [],
      message: 'Registration certificate received. Distributed processing cluster initialized for organization instance.'
    });
  });

  // Number Marketplace: Generate regional virtual numbers
  app.get('/api/numbers/available', (req, res) => {
    const { region } = req.query;
    const count = 15;
    
    let prefix = '25420'; // Kenya default
    if (region === 'UG') prefix = '25641';
    if (region === 'TZ') prefix = '25522';

    const numbers = Array.from({ length: count }, () => {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      return `+${prefix}${randomPart}`;
    });
    res.json({ numbers });
  });

  // Agent Limit Configuration
  app.get('/api/config/limits', (req, res) => {
    res.json({
      maxAgents: 50,
      supportNumbers: Object.keys(supportRoutes)
    });
  });

  // Mock Call Waiting TTS config
  app.get('/api/config/call-waiting', (req, res) => {
    res.json({
      voice: 'Morgan Freeman',
      defaultText: 'welcome to Pamoja Switchboard our services are purely call termination through the internet, we provide the cheapest call services all over the world our agent will talk to you shortly'
    });
  });

  // --- Background Worker / Daemon Simulation ---
  let isDaemonActive = true;
  let daemonStats = {
    heartbeat: new Date().toISOString(),
    processedPackets: 45000,
    activeTasks: 124,
    instanceId: `pmj-daemon-${Math.random().toString(36).substr(2, 6)}`
  };

  // Heartbeat simulation for "Background Working"
  setInterval(() => {
    if (isDaemonActive) {
      daemonStats.processedPackets += Math.floor(Math.random() * 50000000);
      daemonStats.heartbeat = new Date().toISOString();
    }
  }, 1000);

  app.get('/api/daemon/status', sentinelAuth, (req, res) => {
    res.json({
      isActive: isDaemonActive,
      ...daemonStats,
      uptime_sec: process.uptime()
    });
  });

  app.post('/api/daemon/toggle', sentinelAuth, (req, res) => {
    isDaemonActive = !isDaemonActive;
    console.log(`[Daemon] Persistent Background Service toggled: ${isDaemonActive}`);
    res.json({ success: true, isActive: isDaemonActive });
  });

  // --- Independent GSM Gateway Simulation ---
  const isStealthMode = true;

  const generatePorts = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      status: Math.random() > 0.05 ? 'online' : 'offline',
      signal: Math.floor(Math.random() * 31),
      operator: ['Safaricom', 'Airtel', 'Telkom', 'MTN', 'Vodacom'][Math.floor(Math.random() * 5)],
      imei: `35${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      callsHandled: Math.floor(Math.random() * 1000),
      uptime: Math.floor(Math.random() * 100000),
      signature: isStealthMode ? 'Consumer_Mobile_Device' : 'VoIP_Gateway_Generic'
    }));
  };

  let gsmPorts = generatePorts(1000);

  app.get('/api/gsm/status', gsmAuth, (req, res) => {
    res.json({
      isStealthMode,
      totalPorts: '1,000 (Dynamic Cluster)',
      onlinePorts: gsmPorts.filter(p => p.status === 'online').length,
      evasionEfficiency: isStealthMode ? '99.98%' : '15.40%',
      detectionRisk: isStealthMode ? 'Negligible' : 'CRITICAL',
      throughput: '126.6 TB/s',
      scaling: 'Auto-Elastic',
      scalingLatency: '1μs'
    });
  });

  app.post('/api/gsm/toggle-stealth', gsmAuth, (req, res) => {
    // Stealth Mode is now permanent. Toggling is disabled to prevent discovery.
    console.log(`[GSM] Stealth Mode toggle attempt ignored. Protocol is PERMANENT.`);
    res.json({ success: true, isStealthMode: true });
  });

  app.get('/api/gsm/ports', gsmAuth, (req, res) => {
    console.log(`[API] GET /api/gsm/ports - Sending ${gsmPorts.length} ports (Cluster View Active)`);
    try {
      // Return the cluster to keep response performance high
      res.json({ ports: gsmPorts, totalActive: gsmPorts.length });
    } catch (err) {
      console.error('[API] Error sending GSM ports:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/gsm/reboot-port', gsmAuth, (req, res) => {
    const { portId } = req.body;
    console.log(`[API] POST /api/gsm/reboot-port - Port:${portId}`);
    res.json({ success: true, message: `Port ${portId} is rebooting.` });
  });

  // Dialplan Execution Simulation
  app.post('/api/pbx/dialplan', sentinelAuth, (req, res) => {
    const { code, extension, orgId } = req.body;
    console.log(`[API] POST /api/pbx/dialplan - Code:${code} Ext:${extension} Org:${orgId}`);
    
    // Remote Dialing Pattern: *0791242243# or *0001*0791242243#
    const remoteCallMatch = code.match(/^\*(?:(\d{4})\*)?(\d{10,15})#$/);
    
    if (remoteCallMatch) {
      const prefix = remoteCallMatch[1] || '0000';
      const targetNumber = remoteCallMatch[2];
      const maskingPort = req.body.maskingPort || 'DEFAULT_GSM_1';
      
      // A masking port is considered elastic if it is the keyword 'AUTO_ELASTIC' 
      // or if it matches the format of an absorbed virtual number (typically starts with +)
      const isElastic = maskingPort === 'AUTO_ELASTIC' || maskingPort.startsWith('+');
      const bridgeMode = isElastic ? 'HYPER-CONCURRENCY' : 'STANDARD';
      
      console.log(`[PBX] Remote bridge initiated [${bridgeMode}] for Ext:${extension} via Mask:${maskingPort}`);
      
      const maskInfo = isElastic ? `Elastic Mask (${maskingPort})` : `Fixed Mask (${maskingPort})`;
      const capacityInfo = isElastic ? ' (Unlimited Channels Enabled)' : '';
      
      return res.json({
        success: true,
        message: `Bridging agent ${extension} to ${targetNumber} via GSM Relay ${prefix}. ${maskInfo}${capacityInfo} deployed successfully.`,
        action: 'BRIDGE',
        parameters: { target: targetNumber, relay: prefix, mask: maskingPort, concurrency: bridgeMode }
      });
    }

    // Existing Logic for internal codes
    if (code === '*100#') {
      return res.json({ response: 'Status: Pamoja Cloud Balance: 50,000 KES. Uptime: 99.99%', type: 'info' });
    }
    if (code === '*123#') {
      return res.json({ response: 'Entering Queue Management Mode. Current Strategy: Round Robin.', type: 'menu' });
    }
    
    res.json({ response: `Command ${code} executed successfully on local switch.`, type: 'success' });
  });

  app.get('/api/handbook', sentinelAuth, (req, res) => {
    try {
      const handbookPath = path.join(__dirname, 'OPERATIONAL_HANDBOOK.md');
      if (fs.existsSync(handbookPath)) {
        const content = fs.readFileSync(handbookPath, 'utf8');
        res.json({ content });
      } else {
        res.status(404).json({ error: 'Handbook source file not found' });
      }
    } catch (err) {
      console.error('Error reading handbook:', err);
      res.status(500).json({ error: 'Internal Server Error reading handbook' });
    }
  });

  // Explicit 404 for missing API routes to prevent falling through to Vite/SPA index.html
  app.all('/api/*', (req, res) => {
    console.warn(`[SERVER] API 404: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'API route not found', path: req.url });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
});
