import { Loader2 } from 'lucide-react'

function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 
        className={`${sizeClasses[size]} text-primary animate-spin`} 
      />
      {text && (
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">{text}</p>
      )}
    </div>
  )
}

export { LoadingSpinner }
export default LoadingSpinner
