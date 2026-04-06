import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px] min-w-[40px]',
    md: 'px-4 py-3 text-base min-h-[48px] min-w-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[56px] min-w-[56px]',
    xl: 'px-8 py-5 text-xl min-h-[64px] min-w-[64px]'
  }
  
  const variantClasses = {
    primary: 'bg-abhimata-orange text-white hover:bg-abhimata-orange-dark focus:ring-abhimata-orange shadow-sm hover:shadow-md',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 shadow-sm hover:shadow-md',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 shadow-sm hover:shadow-md',
    info: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md',
    outline: 'border-2 border-abhimata-orange text-abhimata-orange hover:bg-abhimata-orange hover:text-white focus:ring-abhimata-orange',
    ghost: 'text-abhimata-orange hover:bg-orange-50 focus:ring-abhimata-orange',
    link: 'text-abhimata-orange hover:text-abhimata-orange-dark underline-offset-4 hover:underline focus:ring-abhimata-orange'
  }
  
  const widthClasses = fullWidth ? 'w-full' : ''
  
  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClasses} ${className}`.trim()
  
  const renderIcon = () => {
    if (loading) {
      return <Loader2 className="animate-spin h-5 w-5" />
    }
    if (Icon) {
      return <Icon className="h-5 w-5" />
    }
    return null
  }
  
  const renderContent = () => {
    const icon = renderIcon()
    
    if (!icon) return children
    
    if (iconPosition === 'left') {
      return (
        <>
          {icon}
          {children && <span className="ml-2">{children}</span>}
        </>
      )
    } else {
      return (
        <>
          {children && <span className="mr-2">{children}</span>}
          {icon}
        </>
      )
    }
  }
  
  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {renderContent()}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
