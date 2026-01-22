import React from "react";
import { Link } from "react-router-dom";

interface BadgeProps {
    text: string;
    linkText?: string;
    linkTo?: string;
}

const Badge: React.FC<BadgeProps> = ({ text, linkText = "Read more", linkTo = "#" }) => (
    <div className="flex flex-wrap items-center justify-center gap-2 border border-gray-300 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
        <p className="text-slate-600 sm:text-slate-500">{text}</p>
        {linkTo && linkTo !== "#" ? (
            <Link
                to={linkTo}
                className="flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-700 transition-colors whitespace-nowrap"
            >
                {linkText}
                <svg className="mt-0.5 shrink-0" width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.959 9.5h11.083m0 0L9.501 3.96m5.541 5.54-5.541 5.542" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </Link>
        ) : (
            <a
                href={linkTo}
                className="flex items-center gap-1 text-indigo-600 font-medium hover:text-indigo-700 transition-colors whitespace-nowrap"
            >
                {linkText}
                <svg className="mt-0.5 shrink-0" width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.959 9.5h11.083m0 0L9.501 3.96m5.541 5.54-5.541 5.542" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </a>
        )}
    </div>
);

export default Badge;