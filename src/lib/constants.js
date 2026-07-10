export const TMDB = "https://api.themoviedb.org/3";

export const img = (path, size = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

export const STATUS_LABELS = {
  watching: "Watching",
  uptodate: "Up to Date",
  planned: "Plan to Watch",
  completed: "Completed",
  onhold: "On Hold",
};

export const STATUS_ORDER = ["watching", "uptodate", "planned", "completed", "onhold"];

export const GENRE_PALETTE = ["#C97352", "#6C8B58", "#B65E3C", "#A9927A", "#8FA998", "#D8A47F", "#8C7355", "#C4967A"];

export const APP_THEMES = {
  'warm-cream': { label: 'Warm Cream', beige: '#F7F3EC', cream: '#FFFDF8', border: '#E6DDD3', text: '#2B2622' },
  'sage': { label: 'Sage', beige: '#E9ECE9', cream: '#F4F7F4', border: '#DCE5DC', text: '#2D342D' },
  'cherry-blossom': { label: 'Cherry Blossom', beige: '#FDF2F4', cream: '#FFFFFF', border: '#F0D5DA', text: '#4A3B3D' },
  'sky': { label: 'Sky', beige: '#EBF3F5', cream: '#F5F9FA', border: '#E2EEF1', text: '#253033' },
  'midnight': { label: 'Midnight', beige: '#121214', cream: '#1E1E22', border: '#2D2D35', text: '#E0E0E0' },
  'obsidian': { label: 'Obsidian', beige: '#0A0A0A', cream: '#171717', border: '#262626', text: '#A3A3A3' },
  'deep-forest': { label: 'Deep Forest', beige: '#0B120B', cream: '#162016', border: '#253525', text: '#D1D9D1' },
  'ocean-depths': { label: 'Ocean Depths', beige: '#0B131E', cream: '#15202B', border: '#2A3A4A', text: '#E8F0F8' }
};

export const getBadges = (stats) => [
  // Milestones
  { id: 'm1', icon: '🐣', label: 'Newbie', condition: stats.movies >= 1, conditionText: 'Watch at least 1 movie' },
  { id: 'm2', icon: '🥉', label: 'Novice', condition: stats.movies >= 10, conditionText: 'Watch at least 10 movies' },
  { id: 'm3', icon: '🥈', label: 'Silver Screen', condition: stats.movies >= 50, conditionText: 'Watch at least 50 movies' },
  { id: 'm4', icon: '🥇', label: 'Gold Watcher', condition: stats.movies >= 100, conditionText: 'Watch at least 100 movies' },
  { id: 'm5', icon: '🔥', label: 'Movie Addict', condition: stats.movies >= 250, conditionText: 'Watch at least 250 movies' },
  { id: 'm6', icon: '💎', label: 'Cinephile', condition: stats.movies >= 500, conditionText: 'Watch at least 500 movies' },
  { id: 'm7', icon: '👑', label: 'Legendary', condition: stats.movies >= 1000, conditionText: 'Watch at least 1000 movies' },
  { id: 'm8', icon: '📺', label: 'TV Novice', condition: stats.totalEpisodes >= 10, conditionText: 'Watch at least 10 episodes' },
  { id: 'm9', icon: '📡', label: 'TV Addict', condition: stats.totalEpisodes >= 500, conditionText: 'Watch at least 500 episodes' },
  { id: 'm10', icon: '🤯', label: 'Series Master', condition: stats.totalEpisodes >= 1000, conditionText: 'Watch at least 1000 episodes' },

  // Taste/Genres 
  { id: 'g1', icon: '👻', label: 'Horror Junkie', condition: stats.genreData.some(g => g.name === 'Horror' && g.value >= 10), conditionText: 'Watch at least 10 Horror movies' },
  { id: 'g2', icon: '🚀', label: 'Sci-Fi Nut', condition: stats.genreData.some(g => g.name === 'Science Fiction' && g.value >= 10), conditionText: 'Watch at least 10 Sci-Fi movies' },
  { id: 'g3', icon: '🧠', label: 'Intellectual', condition: stats.genreData.some(g => g.name === 'Documentary' && g.value >= 5), conditionText: 'Watch at least 5 Documentaries' },
  { id: 'g4', icon: '💖', label: 'Romantic', condition: stats.genreData.some(g => g.name === 'Romance' && g.value >= 10), conditionText: 'Watch at least 10 Romance movies' },
  { id: 'g5', icon: '💥', label: 'Action Hero', condition: stats.genreData.some(g => g.name === 'Action' && g.value >= 20), conditionText: 'Watch at least 20 Action movies' },
  { id: 'g6', icon: '😂', label: 'Humorist', condition: stats.genreData.some(g => g.name === 'Comedy' && g.value >= 20), conditionText: 'Watch at least 20 Comedies' },
  { id: 'g7', icon: '🕵️', label: 'Detective', condition: stats.genreData.some(g => g.name === 'Mystery' && g.value >= 5), conditionText: 'Watch at least 5 Mysteries' },
  { id: 'g8', icon: '⚔️', label: 'Fantasy Fan', condition: stats.genreData.some(g => g.name === 'Fantasy' && g.value >= 10), conditionText: 'Watch at least 10 Fantasy movies' },
  { id: 'g9', icon: '🎭', label: 'Drama Queen', condition: stats.genreData.some(g => g.name === 'Drama' && g.value >= 20), conditionText: 'Watch at least 20 Drama movies' },
  { id: 'g10', icon: '🤠', label: 'Cowboy', condition: stats.genreData.some(g => g.name === 'Western' && g.value >= 3), conditionText: 'Watch at least 3 Western movies' },
  { id: 'g11', icon: '🧗', label: 'Adventurer', condition: stats.genreData.some(g => g.name === 'Adventure' && g.value >= 10), conditionText: 'Watch at least 10 Adventure movies' },
  { id: 'g12', icon: '🚔', label: 'Crime Solver', condition: stats.genreData.some(g => g.name === 'Crime' && g.value >= 10), conditionText: 'Watch at least 10 Crime movies' },
  { id: 'g13', icon: '❄️', label: 'Thriller Seeker', condition: stats.genreData.some(g => g.name === 'Thriller' && g.value >= 10), conditionText: 'Watch at least 10 Thriller movies' },
  { id: 'g14', icon: '👨‍👩‍👧', label: 'Family Man', condition: stats.genreData.some(g => g.name === 'Family' && g.value >= 5), conditionText: 'Watch at least 5 Family movies' },
  { id: 'g15', icon: '🎶', label: 'Musical Lover', condition: stats.genreData.some(g => (g.name === 'Music' || g.name === 'Musical') && g.value >= 5), conditionText: 'Watch at least 5 Musical movies' },

  // Quality/Critics 
  { id: 'q1', icon: '⭐️', label: 'Fair Critic', condition: stats.avg >= 5, conditionText: 'Maintain an average rating of 5 or higher' },
  { id: 'q2', icon: '🌟', label: 'High Standards', condition: stats.avg >= 7, conditionText: 'Maintain an average rating of 7 or higher' },
  { id: 'q3', icon: '🎬', label: 'Film Critic', condition: stats.avg >= 8.5, conditionText: 'Maintain an average rating of 8.5 or higher' },
  { id: 'q4', icon: '⭐', label: 'Gold Standard', condition: stats.avg >= 9.2, conditionText: 'Maintain an average rating of 9.2 or higher' },
  { id: 'q5', icon: '⚖️', label: 'Tough Judge', condition: stats.avg <= 4 && stats.movies > 10, conditionText: 'Have an average rating of 4 or lower and have watched more than 10 movies' },
  { id: 'q6', icon: '🎯', label: 'Precise Rater', condition: stats.movies > 50, conditionText: 'Have watched more than 50 movies' },
  { id: 'q7', icon: '🔍', label: 'Detailer', condition: stats.movies > 100, conditionText: 'Have watched more than 100 movies' },
  { id: 'q8', icon: '📜', label: 'Note Taker', condition: stats.movies > 20, conditionText: 'Have watched more than 20 movies' },
  { id: 'q9', icon: '👁️', label: 'Observer', condition: stats.movies > 5, conditionText: 'Have watched more than 5 movies' },
  { id: 'q10', icon: '🖋️', label: 'Reviewer', condition: stats.movies > 30, conditionText: 'Have watched more than 30 movies' },

  // Dedication/Activity 
  { id: 'd1', icon: '🏃', label: 'Marathoner', condition: stats.totalMinutes >= 5000, conditionText: 'Have watched at least 5000 minutes of content' },
  { id: 'd2', icon: '⚡', label: 'Speed Demon', condition: stats.totalMinutes >= 10000, conditionText: 'Have watched at least 10000 minutes of content' },
  { id: 'd3', icon: '🛋️', label: 'Couch Potato', condition: stats.totalMinutes >= 20000, conditionText: 'Have watched at least 20000 minutes of content' },
  { id: 'd4', icon: '👀', label: 'Watchlist Pro', condition: stats.watchlistCount >= 5, conditionText: 'Have at least 5 items in watchlist' },
  { id: 'd5', icon: '📝', label: 'Planner', condition: stats.watchlistCount >= 20, conditionText: 'Have at least 20 items in watchlist' },
  { id: 'd6', icon: '🌈', label: 'Genre Diver', condition: stats.genreData.length >= 5, conditionText: 'Have watched movies from at least 5 different genres' },
  { id: 'd7', icon: '🌍', label: 'Global Citizen', condition: stats.genreData.length >= 10, conditionText: 'Have watched movies from at least 10 different genres' },
  { id: 'd8', icon: '📅', label: 'Daily Watcher', condition: stats.streaks.current >= 3, conditionText: 'Have a current streak of at least 3 days' },
  { id: 'd9', icon: '🔥', label: 'On Fire', condition: stats.streaks.current >= 7, conditionText: 'Have a current streak of at least 7 days' },
  { id: 'd10', icon: '🌡️', label: 'Inferno', condition: stats.streaks.current >= 14, conditionText: 'Have a current streak of at least 14 days' },
  { id: 'd11', icon: '⏳', label: 'Time Keeper', condition: stats.totalMinutes > 0, conditionText: 'Have watched some content' },
  { id: 'd12', icon: '🏅', label: 'Completionist', condition: stats.shows >= 10, conditionText: 'Have watched at least 10 shows' },
  { id: 'd13', icon: '🧱', label: 'Brick Layer', condition: stats.shows >= 20, conditionText: 'Have watched at least 20 shows' },
  { id: 'd14', icon: '🏗️', label: 'Builder', condition: stats.shows >= 50, conditionText: 'Have watched at least 50 shows' },
  { id: 'd15', icon: '🏁', label: 'The End', condition: stats.shows >= 100, conditionText: 'Have watched at least 100 shows' },

  // New Thematic Badges
  { id: 'b1', icon: '🍿', label: 'Cinema First-Timer', condition: stats?.movies >= 1, conditionText: 'Complete your very first movie.' },
  { id: 'b2', icon: '🕯️', label: 'Midnight Binger', condition: stats?.totalMinutes >= 2000 && stats?.streaks?.current >= 1, conditionText: 'Watch content late into the night.' },
  { id: 'b3', icon: '🏆', label: 'Top Tier Taste', condition: stats?.avg >= 8.0 && stats?.movies >= 20, conditionText: 'Keep an average rating of 8.0+ over 20 movies.' },
  { id: 'b4', icon: '🔗', label: 'Series Completer', condition: stats?.shows >= 5, conditionText: 'Finish 5 full TV series.' },
  { id: 'b5', icon: '🧩', label: 'Eclectic Viewer', condition: stats?.genreData?.length >= 8, conditionText: 'Watch movies from 8 distinct genres.' },
  { id: 'b6', icon: '📽️', label: 'Matinee Idol', condition: stats?.movies >= 100, conditionText: 'Reach a century of watched movies.' },
  { id: 'b7', icon: '🔋', label: 'Energy Saver', condition: stats?.totalEpisodes >= 50, conditionText: 'Binge-watch 50 episodes.' },
  { id: 'b8', icon: '🥇', label: 'Golden Streak', condition: stats?.streaks?.current >= 21, conditionText: 'Maintain a 21-day viewing streak.' },
  { id: 'b9', icon: '🎞️', label: 'Projector Pro', condition: stats?.totalMinutes >= 30000, conditionText: 'Watch over 30,000 minutes of content.' },
  { id: 'b10', icon: '✨', label: 'Reelist Royalty', condition: stats?.movies >= 500 && stats?.avg >= 7.0, conditionText: 'Become a top-tier Reelist user.' }
];
