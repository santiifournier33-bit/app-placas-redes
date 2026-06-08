/**
 * ¿Hay que renovar la cookie de sesión jose (sliding renewal)?
 * Verdadero cuando queda menos de la mitad de la ventana original y el token
 * todavía no venció. Pura: sin imports de next/* → segura para el proxy/edge.
 *
 * @param expSeconds    exp del JWT (segundos epoch).
 * @param maxAgeSeconds ventana original (claim `maxAge`).
 * @param nowSeconds    ahora en segundos epoch.
 */
export function shouldRenewSession(
  expSeconds: number,
  maxAgeSeconds: number,
  nowSeconds: number,
): boolean {
  const remaining = expSeconds - nowSeconds
  return remaining > 0 && remaining < maxAgeSeconds / 2
}
