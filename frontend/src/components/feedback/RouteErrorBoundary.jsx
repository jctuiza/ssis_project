import { Component } from 'react'
export default class RouteErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) return <div role="alert" className="rounded-xl bg-rose-500/10 p-5 text-sm text-rose-500">Unable to load this screen. <button className="underline" onClick={() => window.location.reload()}>Reload</button></div>
    return this.props.children
  }
}

