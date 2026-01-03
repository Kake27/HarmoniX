type Candidate = {
  rank: number;
  tonic_ind: number;
  tonic_name_sharp: string;
  tonic_name_flat: string;
  mode: string;
  score: number;
  gap_to_next: number;
}

export default function CandidatesList({candidates} : {candidates: Candidate[]}) {
    return (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Top Candidates
            </h4>
            <div className="space-y-2">
                {candidates.map((c, idx) => (
                    <div
                    key={c.rank}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                        idx === 0
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                        : "bg-gray-50 dark:bg-gray-700/50"
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <span
                        className={`text-xs font-bold ${
                            idx === 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                        >
                        #{c.rank}
                        </span>
                        <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                                {c.tonic_name_sharp}
                            </span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                                {c.mode}
                            </span>
                        </div>
                    </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Score: {c.score.toFixed(3)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}