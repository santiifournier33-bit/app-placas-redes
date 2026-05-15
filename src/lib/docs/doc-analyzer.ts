/**
 * Cruza datos de Tokko Broker (propiedades) con Google Drive (archivos)
 * para calcular el estado de documentación de cada propiedad.
 */

import {
  type PropertyStatus,
  type DocRequirement,
  getRequirements,
  extractCategory,
  extractDocType,
  CATEGORY_LABELS,
} from './doc-requirements'

// ── Tipos ──

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: number
  createdTime?: string
  webViewLink?: string
  category: string       // extracted from classified name
  docType: string | null // specific document type
}

export interface PropertyDocStatus {
  id: number
  agent: string
  operation: string
  type: string
  location: string
  folderName: string
  status: PropertyStatus
  fileCount: number
  docsPresent: { category: string; label: string; files: DriveFile[] }[]
  docsMissing: { category: string; label: string; priority: 'obligatorio' | 'recomendado' }[]
  unclassifiedFiles: DriveFile[]
  driveFolderId: string | null
  driveUrl: string | null
}

export interface AgentSummary {
  name: string
  total: number
  complete: number
  partial: number
  incomplete: number
  missing: number
  unsynced: number
  percentage: number
}

export interface DocStatusSummary {
  total: number
  synced: number
  unsynced: number
  complete: number
  partial: number
  incomplete: number
  missing: number
  percentage: number
}

export interface FullDocStatus {
  summary: DocStatusSummary
  byAgent: AgentSummary[]
  properties: PropertyDocStatus[]
  lastUpdated: string
}

// ── Tipado de datos de Tokko ──

interface TokkoProperty {
  id: number
  operations?: { operation_type?: string }[]
  type?: { name?: string }
  location?: { name?: string }
  producer?: { name?: string; last_name?: string; email?: string }
  [key: string]: unknown
}

// ── Tipado de datos de Drive ──

interface DriveFolder {
  id: string
  name: string
  files: { id: string; name: string; mimeType: string; size?: string; createdTime?: string; webViewLink?: string }[]
}

interface AgentDriveData {
  agentName: string
  agentFolderId: string
  properties: Map<string, DriveFolder> // propertyId → folder data
}

// ── Operation type maps (from tokko.js) ──

const OPERATION_NAME_MAP: Record<string, string> = {
  'sale': 'Venta',
  'rent': 'Alquiler',
  'temporary rent': 'Alquiler temporario',
}

const TYPE_NAME_MAP: Record<string, string> = {
  'house': 'Casa',
  'apartment': 'Departamento',
  'ph': 'PH',
  'office': 'Oficina',
  'local': 'Local',
  'store': 'Local',
  'warehouse': 'Galpón',
  'land': 'Terreno',
  'lot': 'Lote',
  'country': 'Country',
  'garage': 'Cochera',
  'field': 'Campo',
  'building': 'Edificio',
}

function getAgentName(prop: TokkoProperty): string {
  const producer = prop.producer
  if (!producer) return 'Sin Asesor'
  const name = `${producer.name || ''} ${producer.last_name || ''}`.trim()
  return name || producer.email || 'Sin Asesor'
}

function getOperation(prop: TokkoProperty): string {
  const rawOp = prop.operations?.[0]?.operation_type || ''
  return OPERATION_NAME_MAP[rawOp.toLowerCase()] || rawOp || 'Venta'
}

function getType(prop: TokkoProperty): string {
  const rawType = prop.type?.name || ''
  return TYPE_NAME_MAP[rawType.toLowerCase()] || rawType || 'Propiedad'
}

function getLocation(prop: TokkoProperty): string {
  return prop.location?.name || 'Sin ubicación'
}

// ── Análisis principal ──

/**
 * Analiza los archivos de Drive de una propiedad y calcula su estado
 * de documentación contra los requerimientos de su tipo de operación.
 */
export function analyzePropertyDocs(
  driveFiles: DriveFolder['files'],
  operationType: string,
): {
  status: PropertyStatus
  docsPresent: { category: string; label: string; files: DriveFile[] }[]
  docsMissing: { category: string; label: string; priority: 'obligatorio' | 'recomendado' }[]
  unclassifiedFiles: DriveFile[]
  classifiedFiles: DriveFile[]
} {
  // Classify all files
  const classifiedFiles: DriveFile[] = driveFiles.map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size) : undefined,
    createdTime: f.createdTime,
    webViewLink: f.webViewLink,
    category: extractCategory(f.name),
    docType: extractDocType(f.name),
  }))

  const unclassifiedFiles = classifiedFiles.filter(f => f.category === 'sin_clasificar')
  const classified = classifiedFiles.filter(f => f.category !== 'sin_clasificar')

  const reqs = getRequirements(operationType)
  const allReqs = [...reqs.obligatorios, ...reqs.recomendados]

  // Group present docs by requirement
  const docsPresent: { category: string; label: string; files: DriveFile[] }[] = []
  const docsMissing: { category: string; label: string; priority: 'obligatorio' | 'recomendado' }[] = []

  // Track which categories have files (beyond requirements)
  const categoriesWithFiles = new Set(classified.map(f => f.category))
  const matchedFileIds = new Set<string>()

  for (const req of allReqs) {
    const matchingFiles = classified.filter(f =>
      req.validTypes.some(t => f.docType === t || f.name.includes(t))
    )

    if (matchingFiles.length > 0) {
      matchingFiles.forEach(f => matchedFileIds.add(f.id))
      docsPresent.push({
        category: req.category,
        label: req.label,
        files: matchingFiles,
      })
    } else {
      docsMissing.push({
        category: req.category,
        label: req.label,
        priority: req.priority,
      })
    }
  }

  // Add "other" categories present (not in requirements)
  const reqCategories = new Set(allReqs.map(r => r.category))
  for (const cat of categoriesWithFiles) {
    if (!reqCategories.has(cat)) {
      const filesInCat = classified.filter(f => f.category === cat && !matchedFileIds.has(f.id))
      if (filesInCat.length > 0) {
        docsPresent.push({
          category: cat,
          label: CATEGORY_LABELS[cat] || cat,
          files: filesInCat,
        })
      }
    }
  }

  // Calculate status
  const obligatoriosMet = reqs.obligatorios.every(req =>
    classified.some(f => req.validTypes.some(t => f.docType === t || f.name.includes(t)))
  )

  let status: PropertyStatus
  if (classifiedFiles.length === 0) {
    status = 'missing'
  } else if (!obligatoriosMet) {
    status = 'incomplete'
  } else {
    status = 'complete'
  }

  return { status, docsPresent, docsMissing, unclassifiedFiles, classifiedFiles }
}

/**
 * Cruza la lista completa de propiedades de Tokko con el árbol de Drive
 * y genera el estado completo de documentación.
 */
export function buildFullStatus(
  tokkoProperties: TokkoProperty[],
  driveData: AgentDriveData[],
): FullDocStatus {
  // Build lookup: propertyId → drive data
  const driveLookup = new Map<string, { folder: DriveFolder; agentFolderId: string }>()
  for (const agent of driveData) {
    for (const [propId, folder] of agent.properties) {
      driveLookup.set(propId, { folder, agentFolderId: agent.agentFolderId })
    }
  }

  const properties: PropertyDocStatus[] = []
  const statusCounts = { complete: 0, partial: 0, incomplete: 0, missing: 0, unsynced: 0 }
  const agentMap = new Map<string, AgentSummary>()

  for (const prop of tokkoProperties) {
    const agent = getAgentName(prop)
    const operation = getOperation(prop)
    const type = getType(prop)
    const location = getLocation(prop)
    const propIdStr = String(prop.id)

    const driveEntry = driveLookup.get(propIdStr)

    let propStatus: PropertyDocStatus

    if (!driveEntry) {
      // Not synced to Drive
      propStatus = {
        id: prop.id,
        agent,
        operation,
        type,
        location,
        folderName: `${prop.id} - ${operation} ${type} ${location}`,
        status: 'unsynced',
        fileCount: 0,
        docsPresent: [],
        docsMissing: [],
        unclassifiedFiles: [],
        driveFolderId: null,
        driveUrl: null,
      }
      statusCounts.unsynced++
    } else {
      const analysis = analyzePropertyDocs(driveEntry.folder.files, operation)
      propStatus = {
        id: prop.id,
        agent,
        operation,
        type,
        location,
        folderName: driveEntry.folder.name,
        status: analysis.status,
        fileCount: driveEntry.folder.files.length,
        docsPresent: analysis.docsPresent,
        docsMissing: analysis.docsMissing,
        unclassifiedFiles: analysis.unclassifiedFiles,
        driveFolderId: driveEntry.folder.id,
        driveUrl: `https://drive.google.com/drive/folders/${driveEntry.folder.id}`,
      }
      statusCounts[analysis.status]++
    }

    properties.push(propStatus)

    // Agent aggregation
    if (!agentMap.has(agent)) {
      agentMap.set(agent, {
        name: agent,
        total: 0,
        complete: 0,
        partial: 0,
        incomplete: 0,
        missing: 0,
        unsynced: 0,
        percentage: 0,
      })
    }
    const agentSummary = agentMap.get(agent)!
    agentSummary.total++
    agentSummary[propStatus.status]++
  }

  // Calculate agent percentages
  for (const agent of agentMap.values()) {
    agent.percentage = agent.total > 0
      ? Math.round(((agent.complete + agent.partial) / agent.total) * 100)
      : 0
  }

  const total = tokkoProperties.length
  const synced = total - statusCounts.unsynced

  return {
    summary: {
      total,
      synced,
      unsynced: statusCounts.unsynced,
      complete: statusCounts.complete,
      partial: statusCounts.partial,
      incomplete: statusCounts.incomplete,
      missing: statusCounts.missing,
      percentage: total > 0
        ? Math.round(((statusCounts.complete + statusCounts.partial) / total) * 100)
        : 0,
    },
    byAgent: Array.from(agentMap.values()).sort((a, b) => a.percentage - b.percentage),
    properties: properties.sort((a, b) => {
      const order: Record<PropertyStatus, number> = {
        incomplete: 0, missing: 1, unsynced: 2, partial: 3, complete: 4,
      }
      return order[a.status] - order[b.status]
    }),
    lastUpdated: new Date().toISOString(),
  }
}
