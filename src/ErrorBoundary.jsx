import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Sweetwater Scheduler crashed.', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="min-h-screen bg-cream px-4 py-8 text-charcoal">
          <section className="mx-auto max-w-md rounded-lg bg-paper p-5 shadow-soft">
            <img
              className="mb-4 h-16 w-32 rounded-md bg-charcoal object-contain p-1"
              src="/logo.png"
              alt="Sweetwater Grill"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-black">Sweetwater Grill Scheduler</h1>
            <p className="mt-2 font-semibold text-charcoal/70">Restaurant Employee Scheduling</p>
            <p className="mt-4 rounded-md bg-gold/20 p-3 text-sm text-charcoal">
              Something went wrong while loading the scheduler. Refresh the page, then check your Supabase tables if the issue persists.
            </p>
            <button
              className="mt-4 rounded-md bg-teal px-4 py-3 font-bold text-white"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload App
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
