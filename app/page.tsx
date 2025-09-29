import Link from "next/link";

const cueComponents = [
  {
    id: "ferrules",
    name: "Ferrules",
    description: "Document ferrule specifications, materials, vault plates, and assembly notes",
    icon: "🔧"
  },
  {
    id: "pins",
    name: "Pins", 
    description: "Document pin build styles, exposed lengths, machining steps, and assembly details",
    icon: "📍"
  },
  {
    id: "joints",
    name: "Joints",
    description: "Document joint specifications, machining steps, and assembly notes",
    icon: "🔗"
  },
  {
    id: "modifications",
    name: "Modifications",
    description: "Document cue modifications, custom work, and enhancement procedures",
    icon: "⚙️"
  }
];

export default function Home() {
  // Updated with pins support
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8">
      <div className="container mx-auto px-4">
       

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
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

      </div>
    </div>
  );
}
