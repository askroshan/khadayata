import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { MARITAL_STATUS, DIETS, EDUCATION_LEVELS, MANGLIK, VISA_TYPES } from "./constants";

export const GOTRAS = [
  "Garg", "Kashyap", "Bharadwaj", "Vashishtha", "Atreya", "Sandilya",
  "Parashar", "Gautam", "Angiras", "Kaushik", "Shandilya", "Agastya",
  "Mudgal", "Dhananjay", "Kaundinya", "Mandavya", "Shringi",
];

export type Filters = {
  search: string;
  gender: string;
  minAge: string;
  maxAge: string;
  diet: string;
  maritalStatus: string;
  education: string;
  manglik: string;
  city: string;
  country: string;
  visaType: string;
  gotra: string;
  excludeSameGotra: boolean;
};

const EMPTY_FILTERS: Filters = {
  search: "", gender: "", minAge: "", maxAge: "", diet: "",
  maritalStatus: "", education: "", manglik: "", city: "",
  country: "", visaType: "", gotra: "", excludeSameGotra: false,
};

export function SearchFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasFilters = Object.entries(filters).some(([k, v]) => k !== "search" && v);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, gotra..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Button
          variant={expanded ? "secondary" : "outline"}
          size="icon"
          onClick={() => setExpanded(!expanded)}
          className="shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)} className="text-xs text-destructive">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-muted/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gender</p>
            <Select value={filters.gender} onValueChange={(v) => onChange({ ...filters, gender: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Min Age</p>
            <Input type="number" value={filters.minAge} onChange={(e) => onChange({ ...filters, minAge: e.target.value })} className="h-8 text-xs" placeholder="18" min={18} max={70} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Max Age</p>
            <Input type="number" value={filters.maxAge} onChange={(e) => onChange({ ...filters, maxAge: e.target.value })} className="h-8 text-xs" placeholder="60" min={18} max={70} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Diet</p>
            <Select value={filters.diet} onValueChange={(v) => onChange({ ...filters, diet: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{DIETS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Marital Status</p>
            <Select value={filters.maritalStatus} onValueChange={(v) => onChange({ ...filters, maritalStatus: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{MARITAL_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Education</p>
            <Select value={filters.education} onValueChange={(v) => onChange({ ...filters, education: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{EDUCATION_LEVELS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Manglik</p>
            <Select value={filters.manglik} onValueChange={(v) => onChange({ ...filters, manglik: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{MANGLIK.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">City</p>
            <Input value={filters.city} onChange={(e) => onChange({ ...filters, city: e.target.value })} className="h-8 text-xs" placeholder="e.g., Mumbai" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Country</p>
            <Input value={filters.country} onChange={(e) => onChange({ ...filters, country: e.target.value })} className="h-8 text-xs" placeholder="e.g., India" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Visa Status</p>
            <Select value={filters.visaType} onValueChange={(v) => onChange({ ...filters, visaType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>{VISA_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Gotra</p>
            <Select value={filters.gotra} onValueChange={(v) => onChange({ ...filters, gotra: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                {GOTRAS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <Switch
              id="exclude-same-gotra"
              checked={filters.excludeSameGotra}
              onCheckedChange={(v) => onChange({ ...filters, excludeSameGotra: v })}
            />
            <Label htmlFor="exclude-same-gotra" className="text-xs cursor-pointer">Exclude same Gotra (traditionally incompatible)</Label>
          </div>
        </div>
      )}
    </div>
  );
}

export { EMPTY_FILTERS };
