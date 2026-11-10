import { Icon } from '@/components/ui/Icon'
import { MAX_FILE_SIZE_MB } from '@/constants/config'
import { openFilePicker } from '@/lib/filePicker'

/** First screen: the whole viewport is one big drop target. */
export function WelcomeScreen() {
  return (
    <div className="welcome">
      <button className="welcome-card" onClick={openFilePicker}>
        <span className="welcome-icon">
          <Icon name="upload" size={26} />
        </span>
        <span className="welcome-title">Drop an IFC or .frag file anywhere</span>
        <span className="welcome-hint">or click to browse · several files at once is fine · up to {MAX_FILE_SIZE_MB} MB each</span>
        <span className="btn btn-primary welcome-cta">
          <Icon name="plus" size={14} />
          Choose files
        </span>
      </button>

      <ul className="welcome-points">
        <li><Icon name="shield" size={15} /> Files stay in your browser. Nothing is uploaded</li>
        <li><Icon name="bolt" size={15} /> IFC is converted to the compact .frag format</li>
        <li><Icon name="download" size={15} /> Download the .frag to reopen it instantly later</li>
      </ul>
    </div>
  )
}
