import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? (
      <main className="fatal-error">
        <h1>Simulator error</h1>
        <p>
          The simulator could not render this state. Reset the page to start
          again.
        </p>
      </main>
    ) : (
      this.props.children
    );
  }
}
