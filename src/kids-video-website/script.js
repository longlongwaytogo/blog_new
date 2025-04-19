const categoryTreeDiv = document.getElementById('category-tree');
const videosContainer = document.getElementById('videos-container');
const videoCollectionTitle = document.getElementById('video-collection-title');
const videoGridContainer = document.getElementById('video-grid');

let activeCategory = null;
let activeSubCategory = null;

async function loadCategories() {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const videosData = await response.json();
        
        categoryTreeDiv.innerHTML = '';
        
        // Populate the category tree
        for (const category in videosData) {
            // Create category element
            const categoryElement = document.createElement('div');
            categoryElement.classList.add('video-category');
            categoryElement.dataset.category = category;
            categoryElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <span>${category}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
            `;
            
            // Create container for subcategories
            const subCategoriesContainer = document.createElement('div');
            subCategoriesContainer.classList.add('subcategories-container', 'hidden');
            
            // Add subcategories
            const categoryData = videosData[category];
            for (const subCategory in categoryData) {
                // Create subcategory element
                const subCategoryElement = document.createElement('div');
                subCategoryElement.classList.add('sub-category');
                subCategoryElement.textContent = subCategory;
                subCategoryElement.dataset.category = category;
                subCategoryElement.dataset.subCategory = subCategory;
                
                // Check if this subcategory has nested collections
                const subCategoryData = categoryData[subCategory];
                
                // Special handling for different data types
                if (Array.isArray(subCategoryData)) {
                    // Simple array of videos
                    subCategoryElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Remove active class from all subcategories
                        document.querySelectorAll('.sub-category').forEach(el => {
                            el.classList.remove('active-subcategory');
                        });
                        
                        // Add active class to this subcategory
                        subCategoryElement.classList.add('active-subcategory');
                        
                        // Store active selections
                        activeCategory = category;
                        activeSubCategory = subCategory;
                        
                        loadVideos(category, subCategory);
                    });
                } else if (subCategoryData.bvid) {
                    // Single video
                    subCategoryElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Remove active class from all subcategories
                        document.querySelectorAll('.sub-category').forEach(el => {
                            el.classList.remove('active-subcategory');
                        });
                        
                        // Add active class to this subcategory
                        subCategoryElement.classList.add('active-subcategory');
                        
                        // Store active selections
                        activeCategory = category;
                        activeSubCategory = subCategory;
                        
                        loadVideos(category, subCategory);
                    });
                } else if (subCategoryData.videos) {
                    // Direct video collection - special case like 李白诗集 or 爱上古诗-黄龙老师
                    console.log(`Found direct video collection: ${subCategory}`, subCategoryData);
                    
                    // Fix for special characters in collection names
                    const encodedSubCategory = encodeURIComponent(subCategory);
                    
                    subCategoryElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        // Remove active class from all subcategories
                        document.querySelectorAll('.sub-category').forEach(el => {
                            el.classList.remove('active-subcategory');
                        });
                        
                        // Add active class to this subcategory
                        subCategoryElement.classList.add('active-subcategory');
                        
                        // Store active selections
                        activeCategory = category;
                        activeSubCategory = subCategory;
                        
                        // Debug logging
                        console.log(`Clicked on collection: ${subCategory}`);
                        console.log(`Will load direct collection for: ${category}, ${subCategory}`);
                        
                        loadDirectCollection(category, subCategory);
                    });
                } else {
                    // For subcategories with nested collections, add an expand/collapse function
                    subCategoryElement.classList.add('has-collections');
                    subCategoryElement.innerHTML = `
                        <div class="flex justify-between items-center">
                            <span>${subCategory}</span>
                            <i class="fas fa-chevron-right text-sm"></i>
                        </div>
                    `;
                    
                    // Create container for collection items
                    const collectionsContainer = document.createElement('div');
                    collectionsContainer.classList.add('collections-container', 'hidden', 'pl-4');
                    
                    // Add collection items
                    for (const collection in subCategoryData) {
                        const collectionElement = document.createElement('div');
                        collectionElement.classList.add('collection-item', 'py-1', 'pl-2', 'cursor-pointer', 'hover:bg-gray-100');
                        collectionElement.textContent = collection;
                        collectionElement.dataset.category = category;
                        collectionElement.dataset.subCategory = subCategory;
                        collectionElement.dataset.collection = collection;
                        
                        // Add click event to load this collection's videos
                        collectionElement.addEventListener('click', (e) => {
                            e.stopPropagation();
                            
                            // Remove active class from all collections
                            document.querySelectorAll('.collection-item').forEach(el => {
                                el.classList.remove('bg-gray-100', 'font-medium');
                            });
                            
                            // Add active class to this collection
                            collectionElement.classList.add('bg-gray-100', 'font-medium');
                            
                            // Store active selections
                            activeCategory = category;
                            activeSubCategory = subCategory;
                            
                            loadCollection(category, subCategory, collection);
                        });
                        
                        collectionsContainer.appendChild(collectionElement);
                    }
                    
                    // Toggle collections visibility on subcategory click
                    subCategoryElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        
                        const icon = subCategoryElement.querySelector('i');
                        const isHidden = collectionsContainer.classList.contains('hidden');
                        
                        if (isHidden) {
                            collectionsContainer.classList.remove('hidden');
                            icon.classList.remove('fa-chevron-right');
                            icon.classList.add('fa-chevron-down');
                        } else {
                            collectionsContainer.classList.add('hidden');
                            icon.classList.remove('fa-chevron-down');
                            icon.classList.add('fa-chevron-right');
                        }
                    });
                    
                    // Add collections container after the subcategory
                    subCategoriesContainer.appendChild(subCategoryElement);
                    subCategoriesContainer.appendChild(collectionsContainer);
                    continue; // Skip the regular append below since we already added it
                }
                
                subCategoriesContainer.appendChild(subCategoryElement);
            }
            
            // Toggle subcategories visibility on category click
            categoryElement.addEventListener('click', () => {
                // Remove active class from all categories
                document.querySelectorAll('.video-category').forEach(el => {
                    el.classList.remove('active-category');
                });
                
                // Add active class to this category
                categoryElement.classList.add('active-category');
                
                // Toggle subcategories
                const icon = categoryElement.querySelector('i');
                const isHidden = subCategoriesContainer.classList.contains('hidden');
                
                // Close all other subcategory containers
                document.querySelectorAll('.subcategories-container').forEach(el => {
                    el.classList.add('hidden');
                    const parentIcon = el.previousElementSibling.querySelector('i');
                    if (parentIcon) {
                        parentIcon.classList.remove('fa-chevron-up');
                        parentIcon.classList.add('fa-chevron-down');
                    }
                });
                
                // Toggle this one
                if (isHidden) {
                    subCategoriesContainer.classList.remove('hidden');
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                } else {
                    subCategoriesContainer.classList.add('hidden');
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
            });
            
            categoryTreeDiv.appendChild(categoryElement);
            categoryTreeDiv.appendChild(subCategoriesContainer);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Function to load a direct video collection (like 李白诗集)
async function loadDirectCollection(category, subCategory) {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Show videos container
        videosContainer.classList.remove('hidden');
        
        const collectionData = data[category][subCategory];
        
        console.log("Loading direct collection:", category, subCategory);
        console.log("Collection data:", collectionData);
        
        // Set the title
        videoCollectionTitle.textContent = `${category} - ${subCategory}`;
        
        // Clear the video grid
        videoGridContainer.innerHTML = '';
        
        // Add collection info if available
        if (collectionData.originalUrl || collectionData.episodeCount) {
            const collectionInfo = document.createElement('div');
            collectionInfo.classList.add('text-sm', 'text-gray-500', 'mb-3', 'col-span-full');
            
            let infoText = '';
            if (collectionData.episodeCount) {
                infoText += `共${collectionData.episodeCount}集 `;
            }
            if (collectionData.originalUrl) {
                infoText += `<a href="${collectionData.originalUrl}" target="_blank" class="text-blue-500 hover:underline">查看原始视频</a>`;
            }
            
            collectionInfo.innerHTML = infoText;
            videoGridContainer.appendChild(collectionInfo);
        }
        
        // Display videos from the collection
        if (collectionData.videos && Array.isArray(collectionData.videos)) {
            console.log("Displaying videos from direct collection:", collectionData.videos);
            console.log("Number of videos:", collectionData.videos.length);
            
            if (collectionData.videos.length > 1) {
                displayBilibiliPlayer(collectionData.videos);
            } else if (collectionData.videos.length === 1) {
                displayVideos(collectionData.videos);
            } else {
                const noVideosMessage = document.createElement('div');
                noVideosMessage.classList.add('text-center', 'p-4', 'text-gray-500', 'col-span-full');
                noVideosMessage.textContent = '该视频集暂无视频';
                videoGridContainer.appendChild(noVideosMessage);
            }
        } else {
            console.error("No videos array found in collection data:", collectionData);
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.classList.add('text-center', 'p-4', 'text-red-500', 'col-span-full');
            errorMessage.textContent = '加载视频失败，请刷新页面重试';
            videoGridContainer.appendChild(errorMessage);
        }
    } catch (error) {
        console.error('Error loading direct collection:', error);
        console.error('Error details:', error.stack);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('text-center', 'p-4', 'text-red-500', 'col-span-full');
        errorMessage.textContent = '加载视频失败，请刷新页面重试';
        videoGridContainer.appendChild(errorMessage);
    }
}

// Function to load a specific collection's videos
async function loadCollection(category, subCategory, collection) {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Show videos container
        videosContainer.classList.remove('hidden');
        
        const collectionData = data[category][subCategory][collection];
        
        console.log("Loading collection:", category, subCategory, collection);
        console.log("Collection data:", collectionData);
        
        // Set the title
        videoCollectionTitle.textContent = `${category} - ${subCategory} - ${collection}`;
        
        // Clear the video grid
        videoGridContainer.innerHTML = '';
        
        // Add collection info if available
        if (collectionData.originalUrl || collectionData.episodeCount) {
            const collectionInfo = document.createElement('div');
            collectionInfo.classList.add('text-sm', 'text-gray-500', 'mb-3', 'col-span-full');
            
            let infoText = '';
            if (collectionData.episodeCount) {
                infoText += `共${collectionData.episodeCount}集 `;
            }
            if (collectionData.originalUrl) {
                infoText += `<a href="${collectionData.originalUrl}" target="_blank" class="text-blue-500 hover:underline">查看原始视频</a>`;
            }
            
            collectionInfo.innerHTML = infoText;
            videoGridContainer.appendChild(collectionInfo);
        }
        
        // If it has a videos array, display those videos
        if (collectionData.videos && Array.isArray(collectionData.videos)) {
            console.log("Displaying collection videos array:", collectionData.videos);
            if (collectionData.videos.length > 0) {
                displayBilibiliPlayer(collectionData.videos);
            } else {
                const noVideosMessage = document.createElement('div');
                noVideosMessage.classList.add('text-center', 'p-4', 'text-gray-500', 'col-span-full');
                noVideosMessage.textContent = '该视频集暂无视频';
                videoGridContainer.appendChild(noVideosMessage);
            }
        } else {
            // Otherwise, it might be a single video
            displayVideos([collectionData]);
        }
    } catch (error) {
        console.error('Error loading collection:', error);
        console.error('Error details:', error.stack);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('text-center', 'p-4', 'text-red-500', 'col-span-full');
        errorMessage.textContent = '加载视频失败，请刷新页面重试';
        videoGridContainer.appendChild(errorMessage);
    }
}

async function loadVideos(category, subCategory) {
    try {
        const response = await fetch('videos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Show videos container
        videosContainer.classList.remove('hidden');
        
        const subCategoryData = data[category][subCategory];
        
        console.log("Loading videos for:", category, subCategory);
        console.log("SubCategory data:", subCategoryData);
        
        // Set the title
        videoCollectionTitle.textContent = `${category} - ${subCategory}`;
        
        // Clear the video grid
        videoGridContainer.innerHTML = '';
        
        // Process and display all videos
        if (Array.isArray(subCategoryData)) {
            console.log("Processing as array");
            // Simple array of videos
            displayBilibiliPlayer(subCategoryData);
        } else if (subCategoryData.videos) {
            console.log("Processing as collection with videos array");
            // Collection with videos array and additional properties
            const collectionVideos = subCategoryData.videos;
            
            // Add collection info if available
            if (subCategoryData.originalUrl || subCategoryData.episodeCount) {
                const collectionInfo = document.createElement('div');
                collectionInfo.classList.add('text-sm', 'text-gray-500', 'mb-3', 'col-span-full');
                
                let infoText = '';
                if (subCategoryData.episodeCount) {
                    infoText += `共${subCategoryData.episodeCount}集 `;
                }
                if (subCategoryData.originalUrl) {
                    infoText += `<a href="${subCategoryData.originalUrl}" target="_blank" class="text-blue-500 hover:underline">查看原始视频</a>`;
                }
                
                collectionInfo.innerHTML = infoText;
                videoGridContainer.appendChild(collectionInfo);
            }
            
            displayBilibiliPlayer(collectionVideos);
        } else if (subCategoryData.bvid) {
            console.log("Processing as single video");
            // Single video
            displayVideos([subCategoryData]);
        } else {
            console.log("Processing as nested collections");
            // This is a subcategory with nested collections
            // Just show a message prompting to select a collection
            const messageElement = document.createElement('div');
            messageElement.classList.add('text-center', 'p-4', 'text-gray-500', 'col-span-full');
            messageElement.textContent = '请从左侧选择一个视频集合';
            videoGridContainer.appendChild(messageElement);
        }
    } catch (error) {
        console.error('Error loading videos:', error);
        console.error('Error details:', error.stack);
    }
}

function displayBilibiliPlayer(videos) {
    console.log("DisplayBilibiliPlayer called with videos:", videos);
    
    if (!videos || videos.length === 0) {
        console.error("No videos provided to displayBilibiliPlayer");
        return;
    }
    
    // Ensure videos container is visible and correctly positioned
    videosContainer.classList.remove('hidden');
    videosContainer.style.display = 'block';
    
    if (videos.length <= 1) {
        console.log("Only one video, using displayVideos instead");
        displayVideos(videos);
        return;
    }
    
    // Clear video grid first
    videoGridContainer.innerHTML = '';
    
    // Create Bilibili-style player container
    const bilibiliPlayer = document.createElement('div');
    bilibiliPlayer.classList.add('bilibili-player');
    bilibiliPlayer.style.display = 'flex';
    bilibiliPlayer.style.width = '100%';
    
    // Create main player area
    const mainPlayer = document.createElement('div');
    mainPlayer.classList.add('main-player');
    
    // Create video iframe
    const videoIframe = document.createElement('iframe');
    videoIframe.width = "100%";
    videoIframe.height = "100%";
    videoIframe.frameBorder = "0";
    videoIframe.allowFullscreen = true;
    mainPlayer.appendChild(videoIframe);
    
    // Create playlist area
    const playlist = document.createElement('div');
    playlist.classList.add('playlist');
    
    // Create playlist header
    const playlistHeader = document.createElement('div');
    playlistHeader.classList.add('playlist-header');
    playlistHeader.innerHTML = `
        <span>播放列表</span>
        <span class="playlist-count">${videos.length}个视频</span>
    `;
    
    // Create playlist items container
    const playlistItems = document.createElement('div');
    playlistItems.classList.add('playlist-items');
    
    // Populate playlist items
    videos.forEach((video, index) => {
        const videoTitle = getVideoTitle(video, index);
        
        // Get episode ID from the video or use index + 1 as fallback
        const episodeId = video.id || index + 1;
        
        // Format index to be like "01" instead of just "1"
        const formattedEpisode = String(episodeId).padStart(2, '0');
        
        // 格式化时长为分:秒格式
        const duration = formatDuration(video.duration);
        
        // Create playlist item
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');
        
        playlistItem.innerHTML = `
            <div class="playlist-index">${formattedEpisode}</div>
            <div class="playlist-title">${videoTitle}</div>
            <div class="playlist-duration">${duration}</div>
        `;
        
        // Add click event to play video
        playlistItem.addEventListener('click', () => {
            // Update active class
            playlistItems.querySelectorAll('.playlist-item').forEach(item => {
                item.classList.remove('active');
            });
            playlistItem.classList.add('active');
            
            // Get episode ID from the video or use index + 1 as fallback
            const episodeNumber = video.id || index + 1;
            
            // Update iframe source with p parameter
            let videoUrl = '';
            if (video.originalUrl) {
                // 如果有原始URL，检查是否已有p参数，没有则添加
                videoUrl = video.originalUrl;
                if (!videoUrl.includes('p=')) {
                    videoUrl += videoUrl.includes('?') ? '&p=' + episodeNumber : '?p=' + episodeNumber;
                }
            } else {
                // 构造新的URL，添加p参数
                videoUrl = `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${video.bvid}&high_quality=1&p=${episodeNumber}`;
            }
            
            videoIframe.src = videoUrl;
        });
        
        playlistItems.appendChild(playlistItem);
    });
    
    // Assemble the player
    playlist.appendChild(playlistHeader);
    playlist.appendChild(playlistItems);
    bilibiliPlayer.appendChild(mainPlayer);
    bilibiliPlayer.appendChild(playlist);
    
    // Clear and add to grid
    videoGridContainer.innerHTML = '';
    videoGridContainer.appendChild(bilibiliPlayer);
    
    // Play the first video
    const firstPlaylistItem = playlistItems.querySelector('.playlist-item');
    if (firstPlaylistItem) {
        firstPlaylistItem.click();
    }
}

function displayVideos(videos) {
    console.log("DisplayVideos called with videos:", videos);
    
    if (!videos || videos.length === 0) {
        console.error("No videos provided to displayVideos");
        return;
    }
    
    // Ensure videos container is visible and correctly positioned
    videosContainer.classList.remove('hidden');
    videosContainer.style.display = 'block';
    
    // Clear the grid first
    videoGridContainer.innerHTML = '';
    
    // Check if this is just a single video
    if (videos.length === 1) {
        const video = videos[0];
        
        // Create a single video player
        const singleVideoContainer = document.createElement('div');
        singleVideoContainer.classList.add('single-video-container');
        singleVideoContainer.style.width = '100%';
        singleVideoContainer.style.height = '500px';
        
        // Create video iframe
        const videoIframe = document.createElement('iframe');
        videoIframe.style.width = '100%';
        videoIframe.style.height = '100%';
        videoIframe.frameBorder = "0";
        videoIframe.allowFullscreen = true;
        
        // Set source based on video type
        const episodeNumber = video.id || 1;
        videoIframe.src = `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${video.bvid}&high_quality=1&p=${episodeNumber}`;
        
        singleVideoContainer.appendChild(videoIframe);
        
        // 添加视频标题和时长
        if (video.name || video.title) {
            const titleContainer = document.createElement('div');
            titleContainer.classList.add('video-title-container');
            titleContainer.style.padding = '10px';
            titleContainer.style.display = 'flex';
            titleContainer.style.justifyContent = 'space-between';
            
            const titleSpan = document.createElement('span');
            titleSpan.textContent = video.name || video.title;
            titleSpan.style.fontWeight = 'bold';
            
            const durationSpan = document.createElement('span');
            durationSpan.textContent = formatDuration(video.duration);
            durationSpan.style.color = '#666';
            
            titleContainer.appendChild(titleSpan);
            titleContainer.appendChild(durationSpan);
            singleVideoContainer.appendChild(titleContainer);
        }
        
        videoGridContainer.appendChild(singleVideoContainer);
        return;
    }
    
    // Multiple videos in collection - create a collection card
    const collectionCard = document.createElement('div');
    collectionCard.classList.add('collection-card');
    
    // Create list container
    const videoList = document.createElement('div');
    videoList.classList.add('video-list');
    
    // Create player container
    const playerContainer = document.createElement('div');
    playerContainer.classList.add('player-container');
    
    // Create the iframe (initially empty)
    const videoIframe = document.createElement('iframe');
    videoIframe.width = "100%";
    videoIframe.height = "200";
    videoIframe.frameBorder = "0";
    videoIframe.allowFullscreen = true;
    playerContainer.appendChild(videoIframe);
    
    // Populate the video list
    videos.forEach((video, index) => {
        const videoTitle = getVideoTitle(video, index);
        
        const videoItem = document.createElement('div');
        videoItem.classList.add('video-list-item');
        
        // 创建带有时长的视频项
        const videoItemContent = document.createElement('div');
        videoItemContent.style.display = 'flex';
        videoItemContent.style.justifyContent = 'space-between';
        videoItemContent.style.width = '100%';
        
        const titleSpan = document.createElement('span');
        titleSpan.textContent = videoTitle;
        
        const durationSpan = document.createElement('span');
        durationSpan.textContent = formatDuration(video.duration);
        durationSpan.style.color = '#666';
        durationSpan.style.fontSize = '0.9em';
        
        videoItemContent.appendChild(titleSpan);
        videoItemContent.appendChild(durationSpan);
        videoItem.appendChild(videoItemContent);
        
        videoItem.dataset.index = index;
        
        // Add click event to play video
        videoItem.addEventListener('click', () => {
            // Update active class
            videoList.querySelectorAll('.video-list-item').forEach(item => {
                item.classList.remove('active');
            });
            videoItem.classList.add('active');
            
            // Get episode number
            const episodeNumber = video.id || index + 1;
            
            // Set video source with p parameter
            let videoUrl = '';
            if (video.originalUrl) {
                // 如果有原始URL，检查是否已有p参数，没有则添加
                videoUrl = video.originalUrl;
                if (!videoUrl.includes('p=')) {
                    videoUrl += videoUrl.includes('?') ? '&p=' + episodeNumber : '?p=' + episodeNumber;
                }
            } else {
                // 构造新的URL，添加p参数
                videoUrl = `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${video.bvid}&high_quality=1&p=${episodeNumber}`;
            }
            
            videoIframe.src = videoUrl;
        });
        
        videoList.appendChild(videoItem);
    });
    
    // Assemble the collection card
    collectionCard.appendChild(videoList);
    collectionCard.appendChild(playerContainer);
    
    // Add to the grid
    videoGridContainer.appendChild(collectionCard);
    
    // Automatically play the first video
    const firstVideoItem = videoList.querySelector('.video-list-item');
    if (firstVideoItem) {
        firstVideoItem.click();
    }
}

// Helper function to get the video title from various possible properties in the JSON
function getVideoTitle(video, index) {
    // Check for various possible title properties in order of likelihood
    if (video.title) return video.title;
    if (video.name) return video.name;
    if (video.videoTitle) return video.videoTitle;
    if (video.label) return video.label;
    if (video.text) return video.text;
    if (video.caption) return video.caption;
    
    // If no title property is found, check if there's an id or bvid that can be used
    if (video.id) return `视频: ${video.id}`;
    if (video.bvid) return `视频: ${video.bvid}`;
    
    // Last resort fallback
    return `视频 ${index + 1}`;
}

// 添加格式化时间的函数，将秒数转换为分:秒格式
function formatDuration(seconds) {
    if (!seconds) return "00:00";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    // 格式化为 MM:SS，确保个位数前补0
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Load categories when the page loads
document.addEventListener('DOMContentLoaded', loadCategories); 