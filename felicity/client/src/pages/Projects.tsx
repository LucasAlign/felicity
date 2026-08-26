import { useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import type { Category, Project } from "@shared/schema";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
} from "@/hooks/useProjects";
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";

function ProjectCard({
  project,
  categories,
  available,
}: {
  project: Project;
  categories: Category[];
  available: Category[];
}) {
  const updateCategory = useUpdateCategory();
  const createCategory = useCreateCategory();
  const deleteProject = useDeleteProject();

  const [assignId, setAssignId] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#16a34a");

  function assignExisting(id: string) {
    if (!id) return;
    updateCategory.mutate({ id: Number(id), data: { projectId: project.id } });
    setAssignId("");
  }

  async function createInProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createCategory.mutateAsync({
      name,
      color: newColor,
      projectId: project.id,
    } as any);
    setNewName("");
  }

  return (
    <div
      className="rounded-2xl bg-white/70 border border-forest-100 shadow-soft p-5"
      style={
        project.color
          ? { borderLeft: `4px solid ${project.color}` }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-forest-700 text-lg">{project.name}</h3>
        <button
          onClick={() => {
            if (confirm(`Delete project "${project.name}"? Its categories are kept but unassigned.`))
              deleteProject.mutate(project.id);
          }}
          className="text-forest-300 hover:text-walnut-500 text-sm transition-colors"
          aria-label="Delete project"
        >
          Delete
        </button>
      </div>

      {project.description && (
        <p className="text-forest-400 text-sm mb-3">{project.description}</p>
      )}

      {categories.length === 0 ? (
        <p className="text-forest-400 text-sm mb-3">No categories yet.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-lg bg-white/70 border border-forest-100 px-3 py-1.5 group"
            >
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-sm text-forest-700">{c.name}</span>
              <button
                onClick={() =>
                  updateCategory.mutate({ id: c.id, data: { projectId: null } })
                }
                className="text-forest-300 hover:text-walnut-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Remove ${c.name} from project`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 pt-2 border-t border-forest-100/70">
        {available.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={assignId}
              onChange={(e) => assignExisting(e.target.value)}
              className="flex-1 rounded-lg border border-forest-100 px-2 py-1.5 bg-white/80 text-forest-700 text-sm"
            >
              <option value="">Add an existing category…</option>
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={createInProject} className="flex items-center gap-2">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 shrink-0 rounded border border-forest-100 bg-white p-0.5"
            aria-label="New category color"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category in this project…"
            className="flex-1 rounded-lg border border-forest-100 px-2 py-1.5 bg-white/80 text-forest-700 text-sm"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createCategory.isPending}
            className="shrink-0 rounded-lg bg-forest-600 text-cream-50 px-3 py-1.5 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: categories = [] } = useCategories();
  const createProject = useCreateProject();
  const [newName, setNewName] = useState("");

  const unassigned = categories.filter((c) => c.projectId == null);

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createProject.mutateAsync({ name });
    setNewName("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-forest-600 text-cream-50 shadow-soft">
          <FolderKanban size={16} strokeWidth={2} />
        </span>
        <h2 className="text-3xl text-forest-700">Projects</h2>
      </div>
      <p className="text-forest-400">
        Group your categories under a project. Tasks and appointments tagged
        with those categories belong to the project.
      </p>

      <form onSubmit={handleAddProject} className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New project name…"
          className="flex-1 max-w-sm rounded-lg border border-forest-100 px-3 py-2 bg-white/80 text-forest-700"
        />
        <button
          type="submit"
          disabled={!newName.trim() || createProject.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-forest-600 text-cream-50 px-4 py-2 text-sm shadow-soft hover:bg-forest-700 transition-colors disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={2} />
          Add project
        </button>
      </form>

      {isLoading ? (
        <div className="text-forest-400">Loading&hellip;</div>
      ) : projects.length === 0 ? (
        <p className="text-forest-400">
          No projects yet — create one above to start grouping categories.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              categories={categories.filter((c) => c.projectId === p.id)}
              available={unassigned}
            />
          ))}
        </div>
      )}
    </div>
  );
}
