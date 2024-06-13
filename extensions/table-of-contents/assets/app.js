window.onload = function () {

    var toc = document.querySelector('.toc');
    var tocPath = document.querySelector('.toc-marker path');
    var tocItems;

    // Factor of screen size that the element must cross
    // before it's considered visible
    var TOP_MARGIN = 0.1,
        BOTTOM_MARGIN = 0.2;

    var pathLength;

    var lastPathStart,
        lastPathEnd;

    window.addEventListener('resize', drawPath, false);
    window.addEventListener('scroll', sync, false);

    drawPath();

    function drawPath() {

        tocItems = [].slice.call(toc.querySelectorAll('li'));

        // Cache element references and measurements
        tocItems = tocItems.map(function (item) {
            var anchor = item.querySelector('a');
            var target = document.getElementById(decodeURI(anchor.getAttribute('href')).split('#')[1]);


            return {
                listItem: item,
                anchor: anchor,
                target: target
            };
        });

        // Remove missing targets
        tocItems = tocItems.filter(function (item) {
            return !!item.target;
        });

        var path = [];
        var pathIndent;

        tocItems.forEach(function (item, i) {

            var x = item.anchor.offsetLeft - 5,
                y = item.anchor.offsetTop,
                height = item.anchor.offsetHeight;

            if (i === 0) {
                path.push('M', x, y, 'L', x, y + height);
                item.pathStart = 0;
            }
            else {
                // Draw an additional line when there's a change in
                // indent levels
                if (pathIndent !== x) path.push('L', pathIndent, y);

                path.push('L', x, y);

                // Set the current path so that we can measure it
                tocPath.setAttribute('d', path.join(' '));
                item.pathStart = tocPath.getTotalLength() || 0;

                path.push('L', x, y + height);
            }

            pathIndent = x;

            tocPath.setAttribute('d', path.join(' '));
            item.pathEnd = tocPath.getTotalLength();

        });

        pathLength = tocPath.getTotalLength();

        sync();

    }

    function sync() {

        var windowHeight = window.innerHeight;

        var pathStart = pathLength,
            pathEnd = 0;

        var visibleItems = 0;

        tocItems.forEach(function (item) {

            var targetBounds = item.target.getBoundingClientRect();

            if (targetBounds.bottom > windowHeight * TOP_MARGIN && targetBounds.top < windowHeight * (1 - BOTTOM_MARGIN)) {
                pathStart = Math.min(item.pathStart, pathStart);
                pathEnd = Math.max(item.pathEnd, pathEnd);

                visibleItems += 1;

                item.listItem.classList.add('visible');
            }
            else {
                item.listItem.classList.remove('visible');
            }

        });

        // Specify the visible path or hide the path altogether
        // if there are no visible items
        if (visibleItems > 0 && pathStart < pathEnd) {
            if (pathStart !== lastPathStart || pathEnd !== lastPathEnd) {
                tocPath.setAttribute('stroke-dashoffset', '1');
                tocPath.setAttribute('stroke-dasharray', '1, ' + pathStart + ', ' + (pathEnd - pathStart) + ', ' + pathLength);
                tocPath.setAttribute('opacity', 1);
            }
        }
        else {
            tocPath.setAttribute('opacity', 0);
        }

        lastPathStart = pathStart;
        lastPathEnd = pathEnd;
    }
      
    let lastScrollTop = 0;

    document.addEventListener('scroll', function() {
        const toc = document.querySelector('.toc');
        const footer = document.querySelector('.footer');
        const headings = document.querySelectorAll('h2, h3, h4, h5, h6');
        const viewportHeight = window.innerHeight;
        let headingVisible = false;

        // Check if any heading is visible
        headings.forEach(heading => {
            const rect = heading.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= viewportHeight) {
                headingVisible = true;
            }
        });

        if (!headingVisible) {
            toc.classList.add('hidden');
        } else {
            toc.classList.remove('hidden');
        }

        const footerRect = footer.getBoundingClientRect();
        const scrollTop = window.scrollY;

        // Adjust TOC position based on footer visibility
        if (footerRect.top <= viewportHeight + 100) { // 100px before footer is visible
            toc.classList.add('sticky');
            toc.classList.remove('scrolling');
        } else {
            toc.classList.remove('sticky');
            toc.classList.add('scrolling');
        }

        // Add top-page class while scrolling to the top
        if (scrollTop < lastScrollTop) {
            toc.classList.add('top-page');
        } else {
            toc.classList.remove('top-page');
        }

        lastScrollTop = scrollTop;
    });

    var button = document.createElement("button");

        // Set the button's id to "tocButton"
        button.id = "tocButton";
        button.innerText = "TOC"; // Add some text to the button

        // Append the button to the body of the document
        document.body.appendChild(button);

        // Add a click event listener to the button to toggle the navigation menu
        button.addEventListener("click", function() {
            // Get the navigation element with the class "mobile-toc"
            var nav = document.querySelector(".mobile-toc");

            // Toggle the "open" class on the navigation element
            if (nav) {
                nav.classList.toggle("open");
            }
        });

        var isDragging = false;
        var startY;
        var startTopOffset;

// Function to check if the device is mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Handle dragging
var button = document.getElementById('tocButton'); // Assuming 'tocButton' is the ID of your TOC button
button.addEventListener("mousedown", function(e) {
    if (isMobile()) {
        isDragging = true;
        startY = e.clientY;
        startTopOffset = button.offsetTop;
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    }
});

document.addEventListener("mouseup", function() {
    if (isMobile()) {
        isDragging = false;
        document.body.style.cursor = 'default';
    }
});

document.addEventListener("mousemove", function(e) {
    if (isMobile() && isDragging) {
        var newY = startTopOffset + (e.clientY - startY);
        button.style.top = newY + "px";
        
        // Scroll the TOC based on the button's position
        var toc = document.querySelector(".mobile-toc");
        if (toc) {
            var buttonHeight = button.offsetHeight;
            var tocHeight = toc.offsetHeight;
            var scrollHeight = toc.scrollHeight;
            var scrollTop = (newY / (tocHeight - buttonHeight)) * (scrollHeight - tocHeight);
            toc.scrollTop = scrollTop;

            // Find the corresponding section and scroll to it
            var tocLinks = toc.querySelectorAll('a');
            tocLinks.forEach(function(link) {
                var sectionId = link.getAttribute('href');
                var section = document.querySelector(sectionId);
                if (section) {
                    var sectionTop = section.offsetTop;
                    var sectionBottom = sectionTop + section.offsetHeight;
                    if (newY >= sectionTop && newY <= sectionBottom) {
                        // Smooth scroll to the section
                        smoothScrollToSection(sectionId);
                    }
                }
            });
        }
    }
});

// Function to handle smooth scrolling to a section and update URL
function smoothScrollToSection(targetId) {
    document.querySelector(targetId).scrollIntoView({
        behavior: 'smooth'
    });

    // Update URL based on the targetId
    history.pushState(null, '', targetId);
}


        let lastScrollTop2 = 0;

document.addEventListener('scroll', function() {
    const toc = document.querySelector('.mobile-toc.open');
    const footer = document.querySelector('.footer');
    const viewportHeight = window.innerHeight;

    const footerRect = footer.getBoundingClientRect();
    const scrollTop = window.scrollY;

    if (toc){
                if (footerRect.top <= viewportHeight + 400) { 
                    toc.classList.add('sticky');
                    toc.classList.remove('scrolling');
                } else {
                    toc.classList.remove('sticky');
                    toc.classList.add('scrolling');
                }

                if (scrollTop < lastScrollTop2) {
                    toc.classList.add('top-page');
                } else {
                    toc.classList.remove('top-page');
                }

                if (scrollTop === 0) {
                    toc.classList.add('top-top');
                } else {
                    toc.classList.remove('top-top');
                }
            }
        lastScrollTop2 = scrollTop;
    });

    const tocElement = document.querySelector('.mobile-toc');
    const tocButton = document.querySelector('#tocButton');
    let tocTimeout;

    document.addEventListener('click', function(event) {
        const isInsideToc = tocElement.contains(event.target) || tocButton.contains(event.target);

        if (!isInsideToc) {
            tocElement.classList.remove('open');
            resetTocTimeout();
        } else {
            resetTocTimeout();
        }
    });

    tocElement.addEventListener('mousemove', resetTocTimeout);
    tocElement.addEventListener('click', resetTocTimeout);
    tocElement.addEventListener('scroll', resetTocTimeout);

    function resetTocTimeout() {
        clearTimeout(tocTimeout);
        tocTimeout = setTimeout(() => {
            tocElement.classList.remove('open');
        }, 3000);
    }

    // Function to handle smooth scrolling to a section

    tocElement.addEventListener('click', function(event) {
        const targetId = event.target.getAttribute('href');

        if (targetId) {
            event.preventDefault();
            smoothScrollToSection(targetId);
            tocElement.classList.remove('open');
        }
        resetTocTimeout();
    });

};