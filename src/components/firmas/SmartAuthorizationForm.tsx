import { useState } from 'react'

const numberToWords = (num: number): string => {
  if (num === 0) return 'CERO'
  
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
  const especiales = {
    11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
    21: 'VEINTIUN', 22: 'VEINTIDOS', 23: 'VEINTITRES', 24: 'VEINTICUATRO', 
    25: 'VEINTICINCO', 26: 'VEINTISEIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE'
  }
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

  const convertGroup = (n: number): string => {
    let text = ''
    if (n === 100) return 'CIEN'
    if (n > 99) {
      text += centenas[Math.floor(n / 100)] + ' '
      n = n % 100
    }
    if (n > 10 && n < 30 && n !== 20) {
      // @ts-ignore
      text += especiales[n] + ' '
    } else {
      if (n > 9) {
        text += decenas[Math.floor(n / 10)]
        n = n % 10
        if (n > 0) text += ' Y '
      }
      if (n > 0) text += unidades[n] + ' '
    }
    return text.trim()
  }

  let result = ''
  if (num >= 1000) {
    const miles = Math.floor(num / 1000)
    if (miles === 1) result += 'MIL '
    else result += convertGroup(miles) + ' MIL '
    num = num % 1000
  }
  if (num > 0) {
    result += convertGroup(num)
  }
  return result.trim()
}

const getMonthName = (dateString: string) => {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const date = new Date(dateString + 'T00:00:00') // avoid timezone issues
  return months[date.getMonth()]
}

export default function SmartAuthorizationForm({ 
  template, 
  onSent 
}: { 
  template: any
  onSent: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]
  
  const [data, setData] = useState({
    ownerName: '',
    ownerDni: '',
    ownerAddress: '',
    ownerCity: '',
    ownerState: 'Buenos Aires',
    ownerCivilStatus: 'Soltero/a',
    ownerPhone: '',
    ownerEmail: '',
    hasSpouse: 'NO',
    spouseName: '',
    spouseRole: 'Cónyuge',
    propertyStatus: '',
    aptoCredito: 'NO',
    propertyStreet: '',
    propertyCity: '',
    propertyState: 'Buenos Aires',
    propertyId: '',
    priceUsd: '',
    exclusivityDays: '90',
    startDate: todayStr,
    copies: '2',
    signatureCity: 'Pilar'
  })

  const handleChange = (field: keyof typeof data, value: string) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setError('')
    if (template.roles.length < 2) {
      setError(`Error: La plantilla tiene ${template.roles.length} roles. El Smart Form necesita 2 roles configurados en DocuSeal (1°: Dueño, 2°: Corredor).`)
      return
    }

    if (!data.ownerName || !data.ownerEmail || !data.propertyStreet || !data.priceUsd) {
      setError('Completá los campos obligatorios del Propietario y la Propiedad.')
      return
    }

    setLoading(true)
    try {
      // Calculate Expiration
      const startDateObj = new Date(data.startDate + 'T00:00:00')
      const endDateObj = new Date(startDateObj)
      endDateObj.setDate(endDateObj.getDate() + Number(data.exclusivityDays))
      const endDateFormatted = `${endDateObj.getDate().toString().padStart(2, '0')}/${(endDateObj.getMonth() + 1).toString().padStart(2, '0')}/${endDateObj.getFullYear()}`
      const startDateFormatted = `${startDateObj.getDate().toString().padStart(2, '0')}/${(startDateObj.getMonth() + 1).toString().padStart(2, '0')}/${startDateObj.getFullYear()}`

      const day = startDateObj.getDate().toString()
      const month = getMonthName(data.startDate)
      const year = startDateObj.getFullYear().toString()

      const role1 = template.roles[0]
      const role2 = template.roles[1]

      // Construimos el Payload para DocuSeal sin el rol fantasma
      const submitters = [
        {
          role: role1, // Dueño
          name: data.ownerName,
          email: data.ownerEmail,
          values: {
            nombre_propietario: data.ownerName,
            DNI_propietario: data.ownerDni,
            domicilio_propietario: data.ownerAddress,
            localidad_domicilio_propietario: data.ownerCity,
            partido__domicilio_propietario: data.ownerState,
            estado_civil_propietario: data.ownerCivilStatus,
            telefono_propietario: data.ownerPhone,
            correo_electronico_propietario: data.ownerEmail,
            Nombre_conyuge_conviviente: data.hasSpouse === 'SI' ? data.spouseName : '---',
            caracter_conyuge_o_conviviente: data.hasSpouse === 'SI' ? data.spouseRole : '---',
            afectacion_propiedad: data.propertyStatus || '---',
            apto_credito_si_no: data.aptoCredito,
            domicilio_propiedad_autorizada: data.propertyStreet,
            localidad_propiedad_autorizada: data.propertyCity,
            partido_propiedad_autorizada: data.propertyState,
            partidainmobiliaria_propiedad_autoriz: data.propertyId || '---',
            precio_numeros_propiedad: data.priceUsd,
            precio_palabras_propiedad: numberToWords(Number(data.priceUsd)),
            dias_exclusiva_numeros: data.exclusivityDays,
            dias_exclusiva_palabras: numberToWords(Number(data.exclusivityDays)),
            Fecha_inicio_exclusiva: startDateFormatted,
            fecha_finalizacion_exclusiva: endDateFormatted,
            numeroejemplares_numero: data.copies,
            numeroejemplares_palabra: numberToWords(Number(data.copies)),
            ciudad_de_firma: data.signatureCity,
            dia_firma_exclusiva: day,
            mes_firma_exclusiva: month,
            año_firma_exclusiva: year,
          }
        },
        {
          role: role2, // Corredor Inmobiliario
          name: 'Stella Maris Freire',
          email: 'freirepropiedadespilar@gmail.com',
          values: {
             aclaracion_corredor: 'Stella Maris Freire'
          }
        }
      ]

      let replyToEmail = ''
      try {
        const storedUser = localStorage.getItem('freire_session') || localStorage.getItem('currentUser')
        if (storedUser) {
          const parsed = JSON.parse(storedUser)
          if (parsed.email) replyToEmail = parsed.email
        }
      } catch (e) {}

      const res = await fetch('/api/signatures/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          reply_to: replyToEmail,
          signers: submitters
        })
      })

      const responseData = await res.json()
      if (!res.ok) throw new Error(responseData.error || 'Error al enviar')

      setSuccess('¡Autorización generada y enviada al propietario!')
      setTimeout(() => {
        onSent()
      }, 2500)

    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-6 mt-4">
        {/* Propietario */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <h4 className="font-medium text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--border-subtle)]">Datos del Propietario</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nombre Completo *</label>
              <input type="text" value={data.ownerName} onChange={e => handleChange('ownerName', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email *</label>
              <input type="email" value={data.ownerEmail} onChange={e => handleChange('ownerEmail', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">DNI</label>
              <input type="text" value={data.ownerDni} onChange={e => handleChange('ownerDni', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Teléfono</label>
              <input type="text" value={data.ownerPhone} onChange={e => handleChange('ownerPhone', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Domicilio del Propietario</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Calle y número" value={data.ownerAddress} onChange={e => handleChange('ownerAddress', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
                <input type="text" placeholder="Localidad" value={data.ownerCity} onChange={e => handleChange('ownerCity', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
                <input type="text" placeholder="Partido / Provincia" value={data.ownerState} onChange={e => handleChange('ownerState', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
              </div>
            </div>
            
            <div className="md:col-span-2 pt-4 border-t border-[var(--border-subtle)]">
              <h5 className="text-xs font-semibold text-[var(--text-primary)] mb-3">Información del Cónyuge o Conviviente</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">¿Tiene cónyuge o conviviente?</label>
                  <select value={data.hasSpouse} onChange={e => handleChange('hasSpouse', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors">
                    <option value="NO">NO</option>
                    <option value="SI">SÍ</option>
                  </select>
                </div>
                {data.hasSpouse === 'SI' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nombre Completo</label>
                      <input type="text" value={data.spouseName} onChange={e => handleChange('spouseName', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Carácter</label>
                      <select value={data.spouseRole} onChange={e => handleChange('spouseRole', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors">
                        <option value="Cónyuge">Cónyuge</option>
                        <option value="Conviviente">Conviviente</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Inmueble y Operación */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <h4 className="font-medium text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--border-subtle)]">Inmueble y Condiciones</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ubicación del Inmueble Autorizado *</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Calle y número" value={data.propertyStreet} onChange={e => handleChange('propertyStreet', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
                <input type="text" placeholder="Localidad" value={data.propertyCity} onChange={e => handleChange('propertyCity', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
                <input type="text" placeholder="Partido / Provincia" value={data.propertyState} onChange={e => handleChange('propertyState', e.target.value)} className="col-span-1 bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Afectación de la propiedad (Dejar vacío si no aplica)</label>
              <input type="text" placeholder="Ej: Donación, Usufructo, Sucesión, etc." value={data.propertyStatus} onChange={e => handleChange('propertyStatus', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Partida Inmobiliaria N°</label>
              <input type="text" value={data.propertyId} onChange={e => handleChange('propertyId', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Apto Crédito</label>
              <select value={data.aptoCredito} onChange={e => handleChange('aptoCredito', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors">
                <option value="NO">NO</option>
                <option value="SI">SÍ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Valor de Propiedad (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[var(--text-muted)]">$</span>
                <input type="number" placeholder="Ej: 145000" value={data.priceUsd} onChange={e => handleChange('priceUsd', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg pl-7 pr-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Plazo de Exclusiva (Días)</label>
              <input type="number" value={data.exclusivityDays} onChange={e => handleChange('exclusivityDays', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Fecha de Inicio de Exclusiva</label>
              <input type="date" value={data.startDate} onChange={e => handleChange('startDate', e.target.value)} className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-end">
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        {success && <div className="text-green-400 text-sm mb-3">{success}</div>}
        
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar Autorización al Propietario →'}
        </button>
      </div>
    </div>
  )
}
