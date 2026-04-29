import { Eye, User, Briefcase, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

// Split-screen landing page. Two routes only from here:
//   Patient  -> /login/patient
//   Staff    -> /staff-gate  (clinic keyword required before choosing admin/optom)
//
// Staff access is intentionally de-emphasised visually.
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ─── Left: brand panel with subtle optical SVG ─── */}
      <div className="relative hidden lg:flex items-center justify-center bg-linear-to-br from-blue-600 via-indigo-600 to-teal-600 overflow-hidden">
        {/* Decorative geometric optical pattern, inline SVG, no images. */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 600 800"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="300" cy="400" r="260" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="200" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="140" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="80" stroke="white" strokeWidth="1.5" />
          <circle cx="300" cy="400" r="30" fill="white" fillOpacity="0.15" />
          <line x1="40" y1="400" x2="560" y2="400" stroke="white" strokeWidth="1" />
          <line x1="300" y1="140" x2="300" y2="660" stroke="white" strokeWidth="1" />
          <line x1="120" y1="220" x2="480" y2="580" stroke="white" strokeWidth="1" />
          <line x1="480" y1="220" x2="120" y2="580" stroke="white" strokeWidth="1" />
        </svg>

        <div className="relative z-10 px-12 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/25">
              <Eye className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">OptiBook</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            Smart scheduling for modern eye-care clinics.
          </h2>
          <p className="text-white/80 text-lg">
            Book appointments in seconds. Let the clinic match you with the right
            optometrist automatically.
          </p>
        </div>
      </div>

      {/* ─── Right: action column ─── */}
      <div className="flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-teal-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile-only brand lockup (the left panel is hidden below lg). */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold">OptiBook</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600 mb-8">How would you like to continue?</p>

          {/* Patient — primary CTA */}
          <button
            onClick={() => navigate("/login/patient")}
            className="group w-full text-left border-2 border-blue-200 bg-white hover:border-blue-400 hover:shadow-md rounded-2xl p-5 mb-4 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">I'm a patient</p>
                <p className="text-sm text-gray-500">
                  Book, view, or manage your appointments
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
            </div>
          </button>

          {/* Staff — subtle CTA */}
          <button
            onClick={() => navigate("/staff-gate")}
            className="group w-full text-left border border-gray-200 bg-white/60 hover:bg-white hover:border-gray-300 rounded-2xl p-4 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Staff access</p>
                <p className="text-xs text-gray-500">Clinic login</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
            </div>
          </button>

          <p className="text-center text-sm text-gray-500 mt-8">
            New patient?{" "}
            <Button
              variant="link"
              className="px-1 text-blue-600"
              onClick={() => navigate("/register")}
            >
              Create an account
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
