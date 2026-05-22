export async function handleIncomingMessage(_from: string, body: string): Promise<string> {
  const normalizedBody = body.trim();

  if (normalizedBody === '1') {
    return 'Gracias por confirmar. ✅';
  }

  if (normalizedBody === '0') {
    return 'Entendido. Si necesitas ayuda escríbenos.';
  }

  return '';
}
