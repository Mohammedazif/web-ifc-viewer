import { importFiles } from './importQueue'

/** Opens the system file dialog and imports whatever the user picks. */
export function openFilePicker() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.ifc,.frag'
  input.multiple = true
  input.onchange = () => {
    if (input.files && input.files.length > 0) importFiles(input.files)
  }
  input.click()
}
