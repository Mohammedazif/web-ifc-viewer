/** Readable names for the IFC classes that show up most often in models. */
const NAMES: Record<string, string> = {
  IFCPROJECT: 'Project',
  IFCSITE: 'Site',
  IFCBUILDING: 'Building',
  IFCBUILDINGSTOREY: 'Storey',
  IFCSPACE: 'Space',
  IFCZONE: 'Zone',
  IFCWALL: 'Wall',
  IFCWALLSTANDARDCASE: 'Wall',
  IFCCURTAINWALL: 'Curtain wall',
  IFCSLAB: 'Slab',
  IFCROOF: 'Roof',
  IFCBEAM: 'Beam',
  IFCCOLUMN: 'Column',
  IFCMEMBER: 'Member',
  IFCPLATE: 'Plate',
  IFCFOOTING: 'Footing',
  IFCPILE: 'Pile',
  IFCDOOR: 'Door',
  IFCWINDOW: 'Window',
  IFCSTAIR: 'Stair',
  IFCSTAIRFLIGHT: 'Stair flight',
  IFCRAMP: 'Ramp',
  IFCRAMPFLIGHT: 'Ramp flight',
  IFCRAILING: 'Railing',
  IFCCOVERING: 'Covering',
  IFCOPENINGELEMENT: 'Opening',
  IFCFURNISHINGELEMENT: 'Furnishing',
  IFCFURNITURE: 'Furniture',
  IFCBUILDINGELEMENTPROXY: 'Proxy element',
  IFCBUILDINGELEMENTPART: 'Element part',
  IFCELEMENTASSEMBLY: 'Assembly',
  IFCREINFORCINGBAR: 'Rebar',
  IFCREINFORCINGMESH: 'Reinforcing mesh',
  IFCMECHANICALFASTENER: 'Fastener',
  IFCDISCRETEACCESSORY: 'Accessory',
  IFCFLOWSEGMENT: 'Flow segment',
  IFCFLOWFITTING: 'Flow fitting',
  IFCFLOWTERMINAL: 'Flow terminal',
  IFCFLOWCONTROLLER: 'Flow controller',
  IFCFLOWMOVINGDEVICE: 'Flow moving device',
  IFCFLOWSTORAGEDEVICE: 'Flow storage device',
  IFCFLOWTREATMENTDEVICE: 'Flow treatment device',
  IFCENERGYCONVERSIONDEVICE: 'Energy conversion device',
  IFCDISTRIBUTIONCONTROLELEMENT: 'Control element',
  IFCDISTRIBUTIONELEMENT: 'Distribution element',
  IFCPIPESEGMENT: 'Pipe',
  IFCPIPEFITTING: 'Pipe fitting',
  IFCDUCTSEGMENT: 'Duct',
  IFCDUCTFITTING: 'Duct fitting',
  IFCCABLESEGMENT: 'Cable',
  IFCCABLECARRIERSEGMENT: 'Cable carrier',
  IFCLIGHTFIXTURE: 'Light fixture',
  IFCSANITARYTERMINAL: 'Sanitary terminal',
  IFCAIRTERMINAL: 'Air terminal',
  IFCVALVE: 'Valve',
  IFCPUMP: 'Pump',
  IFCTRANSPORTELEMENT: 'Transport element',
  IFCGEOGRAPHICELEMENT: 'Geographic element',
  IFCCIVILELEMENT: 'Civil element',
  IFCGRID: 'Grid',
  IFCANNOTATION: 'Annotation',
}

const SPATIAL = new Set(['IFCPROJECT', 'IFCSITE', 'IFCBUILDING', 'IFCBUILDINGSTOREY', 'IFCSPACE'])

export const isSpatialCategory = (category: string | null) =>
  !!category && SPATIAL.has(category.toUpperCase())

export function formatCategory(category: string | null): string {
  if (!category) return 'Element'
  const key = category.toUpperCase()
  if (NAMES[key]) return NAMES[key]
  const bare = key.replace(/^IFC/, '')
  return bare.charAt(0) + bare.slice(1).toLowerCase()
}

export function pluralCategory(category: string | null): string {
  const name = formatCategory(category)
  if (/(s|x|sh|ch)$/i.test(name)) return `${name}es`
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`
  return `${name}s`
}
