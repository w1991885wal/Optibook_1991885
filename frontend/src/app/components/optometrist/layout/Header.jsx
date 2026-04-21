import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";

export default function Header() {
  return (
    <header className="sticky top-0 h-16 bg-white border-b px-6 flex items-center justify-end">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=doctor" />
          <AvatarFallback>DJ</AvatarFallback>
        </Avatar>
        <div className="text-right hidden sm:block">
          <p className="font-medium">Dr. Emma Wilson</p>
          <p className="text-sm text-gray-500">Optometrist</p>
        </div>
      </div>
    </header>
  );
}
