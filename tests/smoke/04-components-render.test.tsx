/**
 * Smoke Test 4: Component Rendering
 *
 * Verifies that key components can render without errors
 */

import { render, screen } from '@testing-library/react'
import Badge from '@/components/Badge'

describe('Component Rendering', () => {
  it('should render Badge component with default props', () => {
    render(<Badge>Test Badge</Badge>)

    const badge = screen.getByText('Test Badge')
    expect(badge).toBeInTheDocument()
  })

  it('should render Badge with success variant', () => {
    render(<Badge variant="success">Success</Badge>)

    const badge = screen.getByText('Success')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-green-100')
  })

  it('should render Badge with warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>)

    const badge = screen.getByText('Warning')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-yellow-100')
  })

  it('should render Badge with error variant', () => {
    render(<Badge variant="error">Error</Badge>)

    const badge = screen.getByText('Error')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-100')
  })

  it('should render Badge with different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    expect(screen.getByText('Small')).toHaveClass('text-xs')

    rerender(<Badge size="md">Medium</Badge>)
    expect(screen.getByText('Medium')).toHaveClass('text-xs')

    rerender(<Badge size="lg">Large</Badge>)
    expect(screen.getByText('Large')).toHaveClass('text-sm')
  })
})
