interface ConversionProgressProps {
  progress: number
  stepLabel: string
  fileName: string
}

export function ConversionProgress({ progress, stepLabel, fileName }: ConversionProgressProps) {
  const pct = Math.round(progress * 100)

  const steps = [
    { label: 'Reading file', threshold: 0 },
    { label: 'Parsing geometry', threshold: 0.2 },
    { label: 'Extracting elements', threshold: 0.5 },
    { label: 'Serializing .frag', threshold: 0.8 },
    { label: 'Finalizing', threshold: 0.95 },
  ]

  const currentStep = [...steps].reverse().find(s => progress >= s.threshold)

  return (
    <div className="conversion-section">
      <div className="conversion-header">
        <div className="conversion-spinner" />
        <div>
          <p className="conversion-title">Converting IFC</p>
          <p className="conversion-file">{fileName}</p>
        </div>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="progress-labels">
        <span className="progress-step">{stepLabel || currentStep?.label || 'Processing...'}</span>
        <span className="progress-pct">{pct}%</span>
      </div>

      <div className="conversion-steps">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`conversion-step-dot ${progress >= step.threshold ? 'active' : ''}`}
            title={step.label}
          />
        ))}
      </div>

      <p className="conversion-note">
        Large models may take several minutes. The page will update automatically.
      </p>
    </div>
  )
}
