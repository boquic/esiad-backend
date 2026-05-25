import { ENV } from '../../config/env';

const greetingKeywords = new Set([
  'hola',
  'buenas',
  'buenos dias',
  'buen dia',
  'buenas tardes',
  'buenas noches',
  'hi',
  'hello',
  'menu',
  'menú',
  'info',
  'informacion',
  'información',
  'inicio',
  'empezar',
  'start'
]);

function normalizeIncomingText(body: string): string {
  return body
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getFrontendLinks() {
  const frontendUrl = ENV.FRONTEND_URL.replace(/\/+$/, '');

  return {
    registerUrl: `${frontendUrl}/register`,
    loginUrl: `${frontendUrl}/login`
  };
}

function buildWelcomeMessage(): string {
  const { registerUrl, loginUrl } = getFrontendLinks();

  return [
    'Hola. *Bienvenido a SIGEPED*',
    '_ESIAD Proyectos_',
    '',
    '✨ Gestiona tus pedidos de forma rapida y ordenada desde un solo lugar.',
    '',
    '🛠 *Servicios disponibles:*',
    '• Corte laser',
    '• Ploteo',
    '• Impresion 3D',
    '• Maquetas',
    '',
    '🆕 *Si eres cliente nuevo, registrate aqui:*',
    registerUrl,
    '',
    '🔐 *Si ya tienes cuenta, inicia sesion aqui:*',
    loginUrl,
    '',
    '📋 *Como hacer tu pedido:*',
    '1. Registrate o inicia sesion',
    '2. Entra a *Nuevo pedido*',
    '3. Sube tu plano o archivo',
    '4. Revisa tu presupuesto',
    '5. Si aplica, sube tu pago para validarlo',
    '',
    '📦 *Importante:* todos los pedidos se recogen en tienda.',
    '',
    '💬 Si necesitas ayuda, responde a este mensaje y te orientamos.'
  ].join('\n');
}

export async function handleIncomingMessage(_from: string, body: string): Promise<string> {
  const normalizedBody = normalizeIncomingText(body);

  if (normalizedBody === '1') {
    return '✅ Gracias por confirmar. Te seguiremos avisando por este medio.';
  }

  if (normalizedBody === '0') {
    return '👌 Entendido. Si necesitas ayuda, escribenos por aqui y te orientamos.';
  }

  if (normalizedBody === '4') {
    return '👨‍💼 Un asesor revisara tu mensaje en breve. Mientras tanto, tambien puedes registrarte o iniciar sesion desde la plataforma.';
  }

  if (greetingKeywords.has(normalizedBody)) {
    return buildWelcomeMessage();
  }

  return '';
}
