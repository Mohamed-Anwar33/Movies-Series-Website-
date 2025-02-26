document.addEventListener("DOMContentLoaded", () => {
  const options = {
    method: "GET",
    headers: { accept: "application/json" },
  };

  // Global State
  const isLoggedIn = localStorage.getItem("loggedIn") === "true";
  let moviesData = JSON.parse(localStorage.getItem("offlineMovies")) || [];
  let currentPage = 1;
  let points = parseInt(localStorage.getItem("points")) || 0;
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  let watched = JSON.parse(localStorage.getItem("watched")) || [];
  let watchlist = JSON.parse(localStorage.getItem("watchlist")) || [];
  let likesData = localStorage.getItem("likes");
  let likes = Array.isArray(JSON.parse(likesData)) ? JSON.parse(likesData) : [];

  // DOM Elements
  const logoutBtn = document.getElementById("logoutBtn");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const moviesList = document.getElementById("moviesList");
  const favoritesList = document.getElementById("favoritesList");
  const watchedList = document.getElementById("watchedList");
  const watchlistList = document.getElementById("watchlistList");
  const newReleasesList = document.getElementById("newReleasesList");
  const movieDetails = document.getElementById("movieDetails");
  const profileEmail = document.getElementById("profileEmail");

  // دالة لفحص تسجيل الدخول
  function checkLogin() {
    if (!isLoggedIn) {
      Swal.fire({
        icon: "warning",
        title: "Login Required",
        text: "Please log in to access this feature.",
        confirmButtonText: "Go to Login",
      }).then(() => {
        window.location.href = "login.html";
      });
      return false;
    }
    return true;
  }

  // Helper Functions
  function updatePointsDisplay() {
    const pointsDisplay = document.getElementById("points");
    if (pointsDisplay) pointsDisplay.textContent = points;
  }

  function showLogoutButton() {
    logoutBtn.style.display = "block";
  }

  function hideLoginAndSignUpLinks() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      if (["Login", "Sign Up"].includes(link.textContent.trim())) {
        link.style.display = "none";
      }
    });
  }

  function handleLogout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("loggedInEmail");
    window.location.href = "login.html";
  }

  function enableDarkMode() {
    document.body.classList.add("dark-mode");
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
    darkModeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  // Authentication
  if (isLoggedIn && logoutBtn) {
    showLogoutButton();
    hideLoginAndSignUpLinks();
  }
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // Dark Mode
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode && darkModeToggle) enableDarkMode();
  if (darkModeToggle) darkModeToggle.addEventListener("click", toggleDarkMode);

  // Filter Controls
  const filterElements = {
    searchInput: document.getElementById("searchInput"),
    genreFilter: document.getElementById("genreFilter"),
    sortSelect: document.getElementById("sortSelect"),
    yearFilter: document.getElementById("yearFilter"),
    actorFilter: document.getElementById("actorFilter"),
    durationFilter: document.getElementById("durationFilter"),
  };

  if (filterElements.searchInput) {
    Object.values(filterElements).forEach((element) => {
      if (element) {
        element.addEventListener("input", () => {
          if (checkLogin()) filterAndSortMovies();
        });
        element.addEventListener("change", () => {
          if (checkLogin()) filterAndSortMovies();
        });
      }
    });
  }

  // Load More Button
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      if (checkLogin()) {
        currentPage++;
        loadMovies(currentPage);
      }
    });
  }

  // Initial Page Load
  if (moviesList) {
    if (isLoggedIn) {
      navigator.onLine ? loadMovies(currentPage) : filterAndSortMovies();
      loadNewsFeed();
      startActiveTimeCounter();
    } else {
      moviesList.innerHTML =
        '<p class="text-center">Please log in to view movies</p>';
    }
  }
  if (favoritesList) {
    displayFavorites();
    updatePointsDisplay();
    updateLiveStats();
  }
  if (watchedList) displayWatched();
  if (watchlistList) displayWatchlist();
  if (newReleasesList) loadNewReleases();
  if (movieDetails) loadMovieDetails();
  if (profileEmail) loadProfile();

  // Font Size
  const savedFontSize = localStorage.getItem("fontSize") || "16";
  document.body.style.fontSize = `${savedFontSize}px`;
  const fontSizeInput = document.getElementById("fontSize");
  if (fontSizeInput) fontSizeInput.value = savedFontSize;

  // Back to Top Button
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.style.display = window.scrollY > 100 ? "block" : "none";
    });
    backToTop.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  // Form Setup
  setupSignUpForm();
  setupLoginForm();

  async function loadMovies(page) {
    if (!checkLogin()) return;

    const loadingSpinner = document.getElementById("loadingSpinner");
    if (loadingSpinner) loadingSpinner.style.display = "block";

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/popular?language=en-US&page=${page}&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
        options
      );
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const data = await response.json();

      const newMovies = data.results.map((movie) => ({
        id: movie.id,
        title: movie.title,
        genre: movie.genre_ids,
        overview: movie.overview,
        poster_path: movie.poster_path,
        rating: movie.vote_average,
        release_date: movie.release_date,
        runtime: movie.runtime || 0,
      }));

      moviesData = [...moviesData, ...newMovies];
      localStorage.setItem("offlineMovies", JSON.stringify(moviesData));
      filterAndSortMovies();
      showNotification(
        `Loaded ${newMovies.length} movies from page ${page}!`,
        "success"
      );
    } catch (err) {
      console.error("Error loading movies:", err);
      if (moviesList)
        moviesList.innerHTML =
          '<p class="text-center text-danger">Failed to load movies. Please check your connection or try again later.</p>';
      showNotification("Failed to load movies", "error");
    } finally {
      if (loadingSpinner) loadingSpinner.style.display = "none";
    }
  }

  async function loadNewReleases() {
    if (!checkLogin()) return;

    const loadingSpinner = document.getElementById("loadingSpinner");
    if (loadingSpinner) loadingSpinner.style.display = "block";

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
        options
      );
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const data = await response.json();

      const newMovies = data.results.map((movie) => ({
        id: movie.id,
        title: movie.title,
        genre: movie.genre_ids,
        overview: movie.overview,
        poster_path: movie.poster_path,
        rating: movie.vote_average,
        release_date: movie.release_date,
        runtime: movie.runtime || 0,
      }));

      displayMovies(newMovies, newReleasesList);
    } catch (err) {
      console.error("Error loading new releases:", err);
      if (newReleasesList)
        newReleasesList.innerHTML =
          '<p class="text-center text-danger">Failed to load new releases. Please check your connection or try again later.</p>';
      showNotification("Failed to load new releases", "error");
    } finally {
      if (loadingSpinner) loadingSpinner.style.display = "none";
    }
  }

  function filterAndSortMovies() {
    if (!moviesList) return;
    let filteredMovies = [...moviesData];

    if (filterElements.searchInput?.value) {
      const searchTerm = filterElements.searchInput.value.toLowerCase();
      filteredMovies = filteredMovies.filter(
        (movie) =>
          movie.title.toLowerCase().includes(searchTerm) ||
          movie.overview.toLowerCase().includes(searchTerm)
      );
    }

    if (filterElements.genreFilter?.value) {
      filteredMovies = filteredMovies.filter((movie) =>
        movie.genre.includes(parseInt(filterElements.genreFilter.value))
      );
    }

    if (filterElements.yearFilter?.value) {
      filteredMovies = filteredMovies.filter((movie) =>
        movie.release_date.startsWith(filterElements.yearFilter.value)
      );
    }

    if (filterElements.actorFilter?.value) {
      const actor = filterElements.actorFilter.value.toLowerCase();
      filteredMovies = filteredMovies.filter((movie) => {
        const cast = JSON.parse(localStorage.getItem(`cast_${movie.id}`)) || [];
        return cast.some((c) => c.name.toLowerCase().includes(actor));
      });
    }

    if (filterElements.durationFilter?.value) {
      const duration = parseInt(filterElements.durationFilter.value);
      filteredMovies = filteredMovies.filter(
        (movie) => movie.runtime <= duration
      );
    }

    if (filterElements.sortSelect?.value) {
      const sortBy = filterElements.sortSelect.value;
      filteredMovies.sort((a, b) => {
        if (sortBy === "title-asc") return a.title.localeCompare(b.title);
        if (sortBy === "title-desc") return b.title.localeCompare(a.title);
        if (sortBy === "rating-asc") return a.rating - b.rating;
        if (sortBy === "rating-desc") return b.rating - a.rating;
      });
    }

    displayMovies(filteredMovies);
  }

  function displayMovies(movies, targetList = moviesList) {
    if (!targetList) return;
    if (!isLoggedIn) {
      targetList.innerHTML =
        '<p class="text-center">Please log in to view movies</p>';
      return;
    }

    targetList.innerHTML = movies
      .map(
        (movie) => `
        <div class="col-md-4 mb-4 movie-card-wrapper">
          <div class="card movie-card ultra-card" data-movie-id="${movie.id}">
            <img
              src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
              alt="${movie.title}"
              class="progressive-load lazy-load"
              data-src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
            />
            <div class="card-body">
              <h5 class="card-title neon-text">${movie.title}</h5>
              <p class="card-text">${movie.overview.substring(0, 50)}...</p>
              <p><strong>Rating:</strong> ${movie.rating}</p>
              <button class="btn btn-sm btn-warning neon-btn" onclick="addToFavorites(${
                movie.id
              }, event)">
                <i class="fas fa-heart"></i> Add to Favorites
              </button>
              <button class="btn btn-sm btn-secondary mt-2" onclick="markAsWatched(${
                movie.id
              }, event)">
                <i class="fas fa-eye"></i> Watched
              </button>
              <button class="btn btn-sm btn-primary mt-2" onclick="addToWatchlist(${
                movie.id
              }, event)">
                <i class="fas fa-plus"></i> Watchlist
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    targetList.querySelectorAll(".movie-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (checkLogin()) viewDetails(card.dataset.movieId);
      });
    });

    lazyLoadImages();
  }

  function displayFavorites() {
    if (!favoritesList) return;
    if (!isLoggedIn) {
      favoritesList.innerHTML =
        '<p class="text-center">Please log in to view favorites</p>';
      return;
    }
    if (favorites.length === 0) {
      favoritesList.innerHTML = '<p class="text-center">No favorites yet</p>';
      return;
    }

    favoritesList.innerHTML = favorites
      .map(
        (movie) => `
        <div class="col-md-4 mb-4 movie-card-wrapper">
          <div class="card movie-card ultra-card" data-movie-id="${movie.id}">
            <img
              src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
              alt="${movie.title}"
              class="lazy-load"
              data-src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
            />
            <div class="card-body">
              <h5 class="card-title neon-text">${movie.title}</h5>
              <p class="card-text">${movie.overview.substring(0, 50)}...</p>
              <p><strong>Rating:</strong> ${movie.rating}</p>
              <button class="btn btn-sm btn-danger neon-btn" onclick="removeFromFavorites(${
                movie.id
              })">
                <i class="fas fa-trash"></i> Remove
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    favoritesList.querySelectorAll(".movie-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (checkLogin()) viewDetails(card.dataset.movieId);
      });
    });

    lazyLoadImages();
  }

  function displayWatched() {
    if (!watchedList) return;
    if (!isLoggedIn) {
      watchedList.innerHTML =
        '<p class="text-center">Please log in to view watched movies</p>';
      return;
    }
    if (watched.length === 0) {
      watchedList.innerHTML =
        '<p class="text-center">No watched movies yet</p>';
      return;
    }

    watchedList.innerHTML = watched
      .map(
        (movie) => `
        <div class="col-md-4 mb-4 movie-card-wrapper">
          <div class="card movie-card ultra-card" data-movie-id="${movie.id}">
            <img
              src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
              alt="${movie.title}"
              class="lazy-load"
              data-src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
            />
            <div class="card-body">
              <h5 class="card-title neon-text">${movie.title}</h5>
              <p class="card-text">${movie.overview.substring(0, 50)}...</p>
              <p><strong>Rating:</strong> ${movie.rating}</p>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    watchedList.querySelectorAll(".movie-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (checkLogin()) viewDetails(card.dataset.movieId);
      });
    });

    lazyLoadImages();
  }

  function displayWatchlist() {
    if (!watchlistList) return;
    if (!isLoggedIn) {
      watchlistList.innerHTML =
        '<p class="text-center">Please log in to view watchlist</p>';
      return;
    }
    if (watchlist.length === 0) {
      watchlistList.innerHTML =
        '<p class="text-center">No movies in watchlist yet</p>';
      return;
    }

    watchlistList.innerHTML = watchlist
      .map(
        (movie) => `
        <div class="col-md-4 mb-4 movie-card-wrapper">
          <div class="card movie-card ultra-card" data-movie-id="${movie.id}">
            <img
              src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
              alt="${movie.title}"
              class="lazy-load"
              data-src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
            />
            <div class="card-body">
              <h5 class="card-title neon-text">${movie.title}</h5>
              <p class="card-text">${movie.overview.substring(0, 50)}...</p>
              <p><strong>Rating:</strong> ${movie.rating}</p>
              <button class="btn btn-sm btn-danger neon-btn" onclick="removeFromWatchlist(${
                movie.id
              })">
                <i class="fas fa-trash"></i> Remove
              </button>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    watchlistList.querySelectorAll(".movie-card").forEach((card) => {
      card.addEventListener("click", () => {
        if (checkLogin()) viewDetails(card.dataset.movieId);
      });
    });

    lazyLoadImages();
  }

  async function loadMovieDetails() {
    if (!checkLogin()) return;

    if (!movieDetails) return;
    const movieId = localStorage.getItem("selectedMovieId");
    if (!movieId) {
      movieDetails.innerHTML = '<p class="text-center">No movie selected</p>';
      return;
    }

    // بيانات وهمية لو الـ API مش شغال
    const mockMovie = {
      title: "Sample Movie",
      overview: "This is a sample movie description.",
      vote_average: 7.5,
      release_date: "2023-01-01",
      genres: [{ name: "Action" }, { name: "Drama" }],
      poster_path: "/default_poster.jpg",
      backdrop_path: "/default_backdrop.jpg",
    };

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
        options
      );
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const movie = await response.json();

      movieDetails.innerHTML = `
        <h2 class="neon-text ultra-title">${movie.title}</h2>
        <img
          src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
          alt="${movie.title}"
          class="img-fluid mb-3 progressive-load lazy-load"
          data-src="https://image.tmdb.org/t/p/w500/${movie.poster_path}"
        />
        <p><strong>Overview:</strong> ${movie.overview}</p>
        <p><strong>Rating:</strong> ${movie.vote_average}</p>
        <p><strong>Release Date:</strong> ${movie.release_date}</p>
        <p><strong>Genres:</strong> ${movie.genres
          .map((g) => g.name)
          .join(", ")}</p>
      `;

      const storedRating = localStorage.getItem(`rating_${movieId}`);
      if (storedRating && document.getElementById("personalRating")) {
        document.getElementById("personalRating").value = storedRating;
        document.getElementById(
          "ratingMessage"
        ).textContent = `Your Rating: ${storedRating}`;
      }

      const storedNotes = localStorage.getItem(`notes_${movieId}`);
      if (storedNotes && document.getElementById("notesInput")) {
        document.getElementById("notesInput").value = storedNotes;
        document.getElementById("notesDisplay").textContent = storedNotes;
      }

      const likeBtn = document.querySelector('button[onclick^="toggleLike"]');
      if (likeBtn) {
        const isLiked =
          Array.isArray(likes) && likes.includes(parseInt(movieId));
        likeBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> ${
          isLiked ? "Unlike" : "Like"
        }`;
      }

      loadComments(movieId);
      loadReviews(movieId);
      loadExpandedProfile(movie);
      loadCast(movieId);
      setVideoBackground(movie.backdrop_path);
      lazyLoadImages();
    } catch (err) {
      console.error("Error loading movie details:", err);
      movieDetails.innerHTML =
        '<p class="text-center text-danger">Failed to load movie details from API. Showing sample data instead.</p>';
      movieDetails.innerHTML += `
        <h2 class="neon-text ultra-title">${mockMovie.title}</h2>
        <img
          src="https://image.tmdb.org/t/p/w500/${mockMovie.poster_path}"
          alt="${mockMovie.title}"
          class="img-fluid mb-3 progressive-load lazy-load"
          data-src="https://image.tmdb.org/t/p/w500/${mockMovie.poster_path}"
        />
        <p><strong>Overview:</strong> ${mockMovie.overview}</p>
        <p><strong>Rating:</strong> ${mockMovie.vote_average}</p>
        <p><strong>Release Date:</strong> ${mockMovie.release_date}</p>
        <p><strong>Genres:</strong> ${mockMovie.genres
          .map((g) => g.name)
          .join(", ")}</p>
      `;
      loadComments(movieId);
      loadReviews(movieId);
      loadExpandedProfile(mockMovie);
      loadCast(movieId, true); // true لاستخدام بيانات وهمية
      setVideoBackground(mockMovie.backdrop_path);
      lazyLoadImages();
    }
  }

  async function loadCast(movieId, useMock = false) {
    if (!checkLogin()) return;

    const castList = document.getElementById("castList");
    if (!castList) return;

    // بيانات وهمية
    const mockCast = [
      { name: "Actor 1", character: "Role 1", profile_path: null },
      { name: "Actor 2", character: "Role 2", profile_path: null },
    ];

    if (useMock) {
      renderCast(mockCast);
      return;
    }

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/credits?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
        options
      );
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      const data = await response.json();
      const mainCast = data.cast.slice(0, 5);

      localStorage.setItem(`cast_${movieId}`, JSON.stringify(mainCast));
      renderCast(mainCast);
    } catch (err) {
      console.error("Error loading cast:", err);
      castList.innerHTML =
        "<p>Unable to load cast from API. Showing sample data instead.</p>";
      renderCast(mockCast);
    }

    function renderCast(cast) {
      castList.innerHTML = `
        <h5>Main Cast</h5>
        <div class="cast-list">
          ${cast
            .map(
              (actor) => `
              <div class="cast-item">
                <img
                  src="https://image.tmdb.org/t/p/w200${
                    actor.profile_path || "/default_actor.jpg"
                  }"
                  alt="${actor.name}"
                />
                <p>${actor.name} as ${actor.character}</p>
              </div>
            `
            )
            .join("")}
        </div>
      `;
    }
  }

  function loadExpandedProfile(movie) {
    const expandedProfile = document.getElementById("expandedProfile");
    if (!expandedProfile) return;

    expandedProfile.innerHTML = `
      <p><strong>Budget:</strong> $${
        movie.budget ? movie.budget.toLocaleString() : "N/A"
      }</p>
      <p><strong>Revenue:</strong> $${
        movie.revenue ? movie.revenue.toLocaleString() : "N/A"
      }</p>
      <p><strong>Runtime:</strong> ${
        movie.runtime ? movie.runtime + " minutes" : "N/A"
      }</p>
      <p><strong>Production Companies:</strong> ${
        movie.production_companies?.map((c) => c.name).join(", ") || "N/A"
      }</p>
    `;
  }

  function loadComments(movieId) {
    const commentsList = document.getElementById("commentsList");
    if (!commentsList) return;

    const comments =
      JSON.parse(localStorage.getItem(`comments_${movieId}`)) || [];
    commentsList.innerHTML = comments
      .map(
        (comment) =>
          `<div class="border-bottom py-2 neon-text"><p>${comment.text} <small class="text-muted">(${comment.date})</small></p></div>`
      )
      .join("");
  }

  function loadReviews(movieId) {
    const reviewsList = document.getElementById("reviewsList");
    if (!reviewsList) return;

    const reviews =
      JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
    reviewsList.innerHTML = reviews
      .map(
        (review) =>
          `<div class="border-bottom py-2 neon-text"><p>${review.text} (${review.stars} <i class="fas fa-star"></i>) <small class="text-muted">(${review.date} - ${review.user})</small></p></div>`
      )
      .join("");
  }

  function loadNewsFeed() {
    if (!checkLogin()) return;

    const newsFeed = document.getElementById("newsFeed");
    if (!newsFeed) return;

    fetch(
      "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c",
      options
    )
      .then((res) => res.json())
      .then((data) => {
        newsFeed.innerHTML = `<ul>${data.results
          .slice(0, 5)
          .map((movie) => `<li>${movie.title} is now playing in theaters!</li>`)
          .join("")}</ul>`;
      })
      .catch((err) => {
        console.error("Error loading news feed:", err);
        newsFeed.innerHTML = "<p>Failed to load news feed</p>";
      });
  }

  function loadProfile() {
    if (!checkLogin()) return;

    const profileEmail = document.getElementById("profileEmail");
    if (!profileEmail) return;

    const loggedInEmail = localStorage.getItem("loggedInEmail");
    if (loggedInEmail) profileEmail.textContent = loggedInEmail;

    const profilePic = localStorage.getItem("profilePic");
    if (profilePic) document.getElementById("profilePic").src = profilePic;

    updatePersonalStats();
  }

  function updatePersonalStats() {
    const statsDiv = document.getElementById("personalStats");
    if (!statsDiv) return;

    const thisMonthWatched = watched.filter(
      (w) => new Date(w.release_date).getMonth() === new Date().getMonth()
    ).length;
    const totalWatched = watched.length;
    const genreCount = {};
    watched.forEach((movie) => {
      movie.genre.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const favoriteGenre = Object.entries(genreCount).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const avgRating =
      watched.reduce((sum, movie) => sum + movie.rating, 0) / totalWatched || 0;

    statsDiv.innerHTML = `
      <h3>Personal Stats</h3>
      <p><strong>Watched This Month:</strong> ${thisMonthWatched}</p>
      <p><strong>Total Watched:</strong> ${totalWatched}</p>
      <p><strong>Favorite Genre:</strong> ${getGenreName(
        favoriteGenre ? favoriteGenre[0] : "N/A"
      )}</p>
      <p><strong>Average Rating:</strong> ${avgRating.toFixed(2)}</p>
    `;
  }

  function updateLiveStats() {
    const statsDiv = document.getElementById("favoritesStats");
    if (!statsDiv) return;

    const totalFavorites = favorites.length;
    const totalWatched = watched.length;
    const avgRating =
      favorites.reduce((sum, movie) => sum + movie.rating, 0) /
        totalFavorites || 0;
    const genreCount = {};
    favorites.forEach((movie) => {
      movie.genre.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    });
    const favoriteGenre = Object.entries(genreCount).sort(
      (a, b) => b[1] - a[1]
    )[0];

    statsDiv.innerHTML = `
      <p><strong>Total Favorites:</strong> ${totalFavorites}</p>
      <p><strong>Total Watched:</strong> ${totalWatched}</p>
      <p><strong>Average Rating:</strong> ${avgRating.toFixed(2)}</p>
      <p><strong>Favorite Genre:</strong> ${getGenreName(
        favoriteGenre ? favoriteGenre[0] : "N/A"
      )}</p>
    `;
  }

  function getGenreName(genreId) {
    const genres = {
      28: "Action",
      18: "Drama",
      35: "Comedy",
      12: "Adventure",
      878: "Science Fiction",
    };
    return genres[genreId] || "Unknown";
  }

  // Window Functions
  window.addToFavorites = (movieId, event) => {
    if (!checkLogin()) return;
    event.stopPropagation();
    const movie = moviesData.find((m) => m.id === movieId);
    if (!movie || favorites.some((fav) => fav.id === movieId)) {
      Swal.fire("Warning", "Movie already in favorites", "warning");
      return;
    }
    favorites.push(movie);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    points += 10;
    localStorage.setItem("points", points);
    Swal.fire(
      "Success",
      `${movie.title} added to favorites! +10 points`,
      "success"
    );
    updatePointsDisplay();
    if (favoritesList) displayFavorites();
  };

  window.removeFromFavorites = (movieId) => {
    if (!checkLogin()) return;
    favorites = favorites.filter((fav) => fav.id !== movieId);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    displayFavorites();
    Swal.fire("Success", "Movie removed from favorites", "success");
    updateLiveStats();
  };

  window.markAsWatched = (movieId, event) => {
    if (!checkLogin()) return;
    if (event) event.stopPropagation();
    const movie = moviesData.find((m) => m.id === movieId);
    if (!movie || watched.some((w) => w.id === movieId)) {
      Swal.fire("Warning", "Movie already watched", "warning");
      return;
    }
    watched.push(movie);
    localStorage.setItem("watched", JSON.stringify(watched));
    points += 5;
    localStorage.setItem("points", points);
    Swal.fire(
      "Success",
      `${movie.title} marked as watched! +5 points`,
      "success"
    );
    updatePointsDisplay();
    if (watchedList) displayWatched();
  };

  window.addToWatchlist = (movieId, event) => {
    if (!checkLogin()) return;
    event.stopPropagation();
    const movie = moviesData.find((m) => m.id === movieId);
    if (!movie || watchlist.some((w) => w.id === movieId)) {
      Swal.fire("Warning", "Movie already in watchlist", "warning");
      return;
    }
    watchlist.push(movie);
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    Swal.fire("Success", `${movie.title} added to watchlist`, "success");
    if (watchlistList) displayWatchlist();
  };

  window.removeFromWatchlist = (movieId) => {
    if (!checkLogin()) return;
    watchlist = watchlist.filter((w) => w.id !== movieId);
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
    displayWatchlist();
    Swal.fire("Success", "Movie removed from watchlist", "success");
  };

  window.viewDetails = (movieId) => {
    if (!checkLogin()) return;
    localStorage.setItem("selectedMovieId", movieId);
    window.location.href = "movie-details.html";
  };

  window.watchTrailer = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const trailerPlayer = document.getElementById("trailerPlayer");
    fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        const trailer = data.results.find((video) => video.type === "Trailer");
        if (trailer) {
          trailerPlayer.innerHTML = `<iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>`;
          trailerPlayer.style.display = "block";
        } else {
          Swal.fire("Info", "No trailer available", "info");
        }
      })
      .catch((err) => console.error("Error fetching trailer:", err));
  };

  window.shareMovie = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const movie = moviesData.find((m) => m.id === parseInt(movieId));
    const url = `${window.location.origin}/movie-details.html?movieId=${movieId}`;
    const text = `Check out "${movie.title}" on Movies & Series!`;
    if (navigator.share) {
      navigator.share({ title: movie.title, text, url });
    } else {
      Swal.fire({
        icon: "info",
        title: "Share Link",
        html: `<a href="${url}" target="_blank">${text}</a>`,
      });
    }
  };

  window.startWatchParty = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const partyLink = `${
      window.location.origin
    }/movie-details.html?movieId=${movieId}&party=${Date.now()}`;
    Swal.fire({
      icon: "success",
      title: "Watch Party Started!",
      html: `Share this link: <a href="${partyLink}" target="_blank">${partyLink}</a>`,
    });
  };

  window.toggleCinemaMode = () => {
    if (!checkLogin()) return;
    document.body.classList.toggle("cinema-mode");
    const trailerPlayer = document.getElementById("trailerPlayer");
    if (
      document.body.classList.contains("cinema-mode") &&
      trailerPlayer.style.display === "none"
    ) {
      watchTrailer();
      document
        .querySelectorAll(".container > *:not(#movieDetails, #trailerPlayer)")
        .forEach((el) => (el.style.opacity = "0.3"));
    } else {
      trailerPlayer.style.display = "none";
      trailerPlayer.innerHTML = "";
      document
        .querySelectorAll(".container > *")
        .forEach((el) => (el.style.opacity = "1"));
    }
  };

  window.getSelectedMovieId = () => {
    return parseInt(localStorage.getItem("selectedMovieId"));
  };

  window.toggleLike = (movieId) => {
    if (!checkLogin()) return;
    const likeBtn = document.querySelector('button[onclick^="toggleLike"]');
    if (!likeBtn) return;

    movieId = parseInt(movieId);
    const isLiked = Array.isArray(likes) && likes.includes(movieId);

    if (isLiked) {
      likes = likes.filter((id) => id !== movieId);
      likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Like';
      Swal.fire("Success", "Movie unliked!", "success");
    } else {
      likes.push(movieId);
      likeBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Unlike';
      Swal.fire("Success", "Movie liked!", "success");
    }

    localStorage.setItem("likes", JSON.stringify(likes));
  };

  window.savePersonalRating = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const rating = document.getElementById("personalRating").value;
    if (rating < 0 || rating > 10) {
      Swal.fire("Error", "Rating must be between 0 and 10", "error");
      return;
    }
    localStorage.setItem(`rating_${movieId}`, rating);
    document.getElementById(
      "ratingMessage"
    ).textContent = `Your Rating: ${rating}`;
    Swal.fire("Success", "Rating saved!", "success");
  };

  window.saveComment = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const comment = document.getElementById("commentInput").value;
    if (!comment) {
      Swal.fire("Error", "Please write a comment", "error");
      return;
    }
    let comments =
      JSON.parse(localStorage.getItem(`comments_${movieId}`)) || [];
    comments.push({ text: comment, date: new Date().toLocaleString() });
    localStorage.setItem(`comments_${movieId}`, JSON.stringify(comments));
    document.getElementById("commentInput").value = "";
    loadComments(movieId);
    Swal.fire("Success", "Comment saved!", "success");
  };

  window.saveReview = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const reviewText = document.getElementById("reviewInput").value;
    const reviewStars = document.getElementById("reviewStars").value;
    if (!reviewText) {
      Swal.fire("Error", "Please write a review", "error");
      return;
    }
    let reviews = JSON.parse(localStorage.getItem(`reviews_${movieId}`)) || [];
    reviews.push({
      text: reviewText,
      stars: reviewStars,
      date: new Date().toLocaleString(),
      user: localStorage.getItem("loggedInEmail"),
    });
    localStorage.setItem(`reviews_${movieId}`, JSON.stringify(reviews));
    document.getElementById("reviewInput").value = "";
    loadReviews(movieId);
    Swal.fire("Success", "Review submitted!", "success");
  };

  window.saveNotes = () => {
    if (!checkLogin()) return;
    const movieId = localStorage.getItem("selectedMovieId");
    const notes = document.getElementById("notesInput").value;
    localStorage.setItem(`notes_${movieId}`, notes);
    document.getElementById("notesDisplay").textContent = notes;
    Swal.fire("Success", "Notes saved!", "success");
  };

  window.setCustomNotification = (movieId) => {
    if (!checkLogin()) return;
    const time = document.getElementById("customNotificationTime").value;
    if (!time) {
      Swal.fire("Error", "Please select a time", "error");
      return;
    }
    Swal.fire("Info", "Custom notifications not fully implemented yet", "info");
  };

  window.showMovieSchedule = () => {
    if (!checkLogin()) return;
    fetch(
      `https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1&api_key=6ca0a8ba66555ed5deb3e6d9ddb2aa6c`,
      options
    )
      .then((res) => res.json())
      .then((data) => {
        let html = "<h3>Upcoming Movies</h3><ul>";
        data.results.slice(0, 5).forEach((movie) => {
          html += `<li>${movie.title} - ${movie.release_date} <button class="btn btn-sm btn-primary" onclick="addToReminders('${movie.id}', '${movie.release_date}')">Remind Me</button></li>`;
        });
        html += "</ul>";
        Swal.fire({ title: "Movie Schedule", html, width: 600 });
      })
      .catch((err) => console.error("Error fetching schedule:", err));
  };

  window.addToReminders = (movieId, releaseDate) => {
    if (!checkLogin()) return;
    const reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    if (!reminders.some((r) => r.movieId === movieId)) {
      reminders.push({ movieId, releaseDate });
      localStorage.setItem("reminders", JSON.stringify(reminders));
      Swal.fire("Success", `Reminder set for ${releaseDate}`, "success");
    } else {
      Swal.fire("Warning", "Reminder already set", "warning");
    }
  };

  window.createAutoPlaylist = () => {
    if (!checkLogin()) return;
    Swal.fire({
      title: "Create Auto Playlist",
      html: `
        <select id="playlistGenre" class="form-select mb-2">
          <option value="">Select Genre</option>
          <option value="28">Action</option>
          <option value="18">Drama</option>
          <option value="35">Comedy</option>
          <option value="12">Adventure</option>
          <option value="878">Science Fiction</option>
        </select>
        <input id="playlistYear" type="number" class="form-control mb-2" placeholder="Year" min="1900" max="2025">
        <input id="playlistRating" type="number" class="form-control" placeholder="Min Rating (0-10)" min="0" max="10">
      `,
      showCancelButton: true,
      confirmButtonText: "Generate",
    }).then((result) => {
      if (result.isConfirmed) {
        const genre = document.getElementById("playlistGenre").value;
        const year = document.getElementById("playlistYear").value;
        const minRating =
          parseFloat(document.getElementById("playlistRating").value) || 0;

        let filteredMovies = moviesData
          .filter((movie) => {
            return (
              (!genre || movie.genre.includes(parseInt(genre))) &&
              (!year || movie.release_date.startsWith(year)) &&
              movie.rating >= minRating
            );
          })
          .slice(0, 5);

        let html = "<h3>Your Playlist:</h3><ul>";
        filteredMovies.forEach((movie) => {
          html += `<li>${movie.title} (Rating: ${movie.rating})</li>`;
        });
        html +=
          "</ul><button onclick='savePlaylist(this.previousElementSibling)'>Save Playlist</button>";
        Swal.fire({ icon: "success", title: "Playlist Generated!", html });
      }
    });
  };

  window.savePlaylist = (playlistElement) => {
    if (!checkLogin()) return;
    const playlist = Array.from(playlistElement.children).map(
      (li) => li.textContent
    );
    localStorage.setItem("autoPlaylist", JSON.stringify(playlist));
    Swal.fire("Success", "Playlist saved!", "success");
  };

  window.changeBackground = () => {
    if (!checkLogin()) return;
    const randomMovie =
      moviesData[Math.floor(Math.random() * moviesData.length)];
    if (randomMovie) {
      document.body.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${randomMovie.poster_path})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
    }
  };

  window.showRandomMovie = () => {
    if (!checkLogin()) return;
    if (moviesData.length === 0) {
      Swal.fire("Warning", "No movies available", "warning");
      return;
    }
    const randomMovie =
      moviesData[Math.floor(Math.random() * moviesData.length)];
    Swal.fire({
      title: "Random Movie",
      html: `<strong>${randomMovie.title}</strong><br>${randomMovie.overview}<br><button class="btn btn-primary mt-2" onclick="viewDetails(${randomMovie.id})">View Details</button>`,
    });
  };

  window.voiceSearch = () => {
    if (!checkLogin()) return;
    if (!("webkitSpeechRecognition" in window)) {
      Swal.fire("Error", "Voice search not supported in this browser", "error");
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      filterElements.searchInput.value = transcript;
      filterAndSortMovies();
    };
    recognition.start();
  };

  window.redeemPoints = () => {
    if (!checkLogin()) return;
    if (points >= 50) {
      points -= 50;
      localStorage.setItem("points", points);
      Swal.fire(
        "Success",
        "Points redeemed! New background unlocked!",
        "success"
      );
      updatePointsDisplay();
      changeBackground();
    } else {
      Swal.fire("Warning", "You need 50 points to redeem", "warning");
    }
  };

  window.exportFavorites = () => {
    if (!checkLogin()) return;
    if (favorites.length === 0) {
      Swal.fire("Warning", "No favorites to export", "warning");
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(favorites));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "favorites.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("Favorites exported successfully!", "success");
  };

  window.importFavorites = (event) => {
    if (!checkLogin()) return;
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedFavorites = JSON.parse(e.target.result);
        importedFavorites.forEach((movie) => {
          if (!favorites.some((f) => f.id === movie.id)) {
            favorites.push(movie);
            points += 5;
          }
        });
        localStorage.setItem("favorites", JSON.stringify(favorites));
        localStorage.setItem("points", points);
        displayFavorites();
        updatePointsDisplay();
        updateLiveStats();
        showNotification("Favorites imported successfully!", "success");
      } catch (err) {
        Swal.fire("Error", "Invalid file format", "error");
      }
    };
    reader.readAsText(file);
  };

  window.updateProfilePic = (event) => {
    if (!checkLogin()) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgData = e.target.result;
      localStorage.setItem("profilePic", imgData);
      document.getElementById("profilePic").src = imgData;
      Swal.fire("Success", "Profile picture updated!", "success");
    };
    reader.readAsDataURL(file);
  };

  window.uploadCustomBackground = (event) => {
    if (!checkLogin()) return;
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      document.body.style.backgroundImage = `url(${e.target.result})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      Swal.fire("Success", "Custom background uploaded!", "success");
    };
    reader.readAsDataURL(file);
  };

  window.changeFontSize = (size) => {
    if (!checkLogin()) return;
    localStorage.setItem("fontSize", size);
    document.body.style.fontSize = `${size}px`;
  };

  // Utility Functions
  function showNotification(message, type) {
    const notificationBar = document.getElementById("notificationBar");
    if (!notificationBar) return;
    const notificationMessage = document.getElementById("notificationMessage");
    if (notificationMessage) {
      notificationMessage.textContent = message;
      notificationBar.className = `notification-bar ${type}`;
      notificationBar.style.display = "flex";
      setTimeout(() => (notificationBar.style.display = "none"), 3000);
    }
  }

  window.hideNotification = () => {
    const notificationBar = document.getElementById("notificationBar");
    if (notificationBar) notificationBar.style.display = "none";
  };

  function startActiveTimeCounter() {
    const activeTimeDisplay = document.getElementById("activeTime");
    if (!activeTimeDisplay) return;
    let activeTime = 0;
    setInterval(() => {
      activeTime++;
      const minutes = Math.floor(activeTime / 60);
      const seconds = activeTime % 60;
      activeTimeDisplay.textContent = `${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds}`;
    }, 1000);
  }

  function lazyLoadImages() {
    const lazyImages = document.querySelectorAll(".lazy-load");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src || "/default_image.jpg"; // صورة افتراضية لو الصورة مش موجودة
          img.classList.remove("lazy-load");
          observer.unobserve(img);
        }
      });
    });
    lazyImages.forEach((img) => observer.observe(img));
  }

  function setVideoBackground(backdropPath) {
    document.body.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${backdropPath})`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }

  function setupSignUpForm() {
    const signupForm = document.getElementById("signupForm");
    if (!signupForm) return;

    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;
      const users = JSON.parse(localStorage.getItem("users") || "[]");

      if (users.some((user) => user.email === email)) {
        Swal.fire("Error", "Email already exists!", "error");
        return;
      }

      users.push({ email, password });
      localStorage.setItem("users", JSON.stringify(users));
      Swal.fire(
        "Success",
        "Sign up successful! Please log in.",
        "success"
      ).then(() => {
        window.location.href = "login.html";
      });
    });
  }

  function setupLoginForm() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("loggedInEmail", email);
        Swal.fire("Success", "Login successful!", "success").then(() => {
          window.location.href = "index.html";
        });
      } else {
        Swal.fire("Error", "Invalid email or password!", "error");
      }
    });
  }
});
