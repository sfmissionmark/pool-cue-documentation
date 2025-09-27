import Link from "next/link";

const cueComponents = [
  {
    id: "ferrules",
    name: "Ferrules",
    description: "Document ferrule specifications, materials, and assembly notes",
    icon: "🔧"
  },
  {
    id: "tips",
    name: "Tips",
    description: "Track tip types, hardness, installation, and maintenance",
    icon: "🎯"
  },
  {
    id: "shafts",
    name: "Shafts",
    description: "Document shaft materials, taper, joint specifications",
    icon: "📏"
  },
  {
    id: "joints",
    name: "Joints",
    description: "Record joint types, threading, and connection details",
    icon: "🔗"
  },
  {
    id: "butts",
    name: "Butts",
    description: "Document butt construction, weight, and balance points",
    icon: "⚖️"
  },
  {
    id: "wraps",
    name: "Wraps",
    description: "Track wrap materials, patterns, and installation methods",
    icon: "🎨"
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Pool Cue Documentation
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Document and track the specifications, build processes, and assembly notes for pool cue components
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {cueComponents.map((component) => (
            <Link
              key={component.id}
              href={`/components/${component.id}`}
              className="group bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600"
            >
              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">{component.icon}</span>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {component.name}
                </h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {component.description}
              </p>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Document →
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 max-w-md mx-auto border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Quick Start
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Select a cue component above to begin documenting sizes, build styles, machining steps, and assembly notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
