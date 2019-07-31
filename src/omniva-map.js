(function ($) {
  $.fn.omniva = function (options) {
    var settings = $.extend({
      autoHide: true,
      maxShow: 8,
      showMap: true,
      country_code: 'LT',
      terminals: [],
      path_to_img: 'images/omniva/',
      translate: {
        modal_header: 'Omniva terminals',
        search_bar_title: 'Omniva addresses',
        search_bar_placeholder: 'Enter postcode/address',
        search_back_to_list: 'Back to list',
        select_terminal: 'Choose terminal',
        show_on_map: 'Show on map',
        show_more: 'Show more',
        place_not_found: 'Place not found'
      }
    }, options);

    console.log('Omniva Initiated');

    var UI = {
      hook: $(this), // element thats been used to initialize omniva (normally radio button)
      // overlay used to show loading
      loader: $('<div class="loading-overlay" style="display: none;"></div>'),
      terminal_container: $('<div class="terminal-container" ' +
        (settings.autoHide ? 'style = "display: none;"' : '') + '></div>'),
      container: $('<div class="omniva-terminals-list"></div>'),
      show_on_map_btn: $(
        '<button type="button" class="omniva-btn">' + settings.translate.show_on_map +
        '  <img src="' + settings.path_to_img + 'sasi.png" title="' + settings.translate.show_on_map + '">' +
        '</button>'),
      dropdown: $('<div class="dropdown">' + settings.translate.select_terminal + '</div>'),
      search: $('<input type="text" placeholder="' + settings.translate.search_bar_placeholder + '" class="search-input"/>'),
      list: $('<ul></ul>'),
      showMapBtn: $('<li><a href="#" class="show-in-map">' + settings.translate.show_on_map + '</a></li>'),
      showMore: $('<div class="show-more"><a href="#">' + settings.translate.show_more + '</a></div>').hide(),
      innerContainer: $('<div class="inner-container"></div>').hide(),
      // map modal
      modal: $( // id="omnivaLtModal" 
        '<div class="omniva-modal">' +
        '  <div class="omniva-modal-content">' +
        '    <div class="omniva-modal-header">' +
        '      <span class="omniva-modal-close">&times;</span>' +
        '      <h5 style="display: inline">' + settings.translate.modal_header + '</h5>' +
        '    </div>' +
        '    <div class="omniva-modal-body">' +
        '      <div class="omniva-map-container"></div>' +
        '      <div class="omniva-search-bar">' +
        '        <h4 style="margin-top: 0px;">' + settings.translate.search_bar_title + '</h4>' +
        '        <div class="omniva-search">' +
        '          <form>' +
        '            <input type="text" placeholder="' + settings.translate.search_bar_placeholder + '" />' +
        '            <button type="submit" class="omniva-modal-search-btn"></button>' +
        '          </form>' +
        '          <div class="omniva-autocomplete omniva-scrollbar" style="display:none;">' +
        '            <ul></ul>' +
        '          </div>' +
        '        </div>' +
        '        <div class="omniva-back-to-list" style="display:none;">' + settings.translate.search_back_to_list + '</div>' +
        '        <div class="found_terminals omniva-scrollbar omniva-scrollbar-style-8">' +
        '          <ul></ul>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>')
    };

    var timeoutID = null;
    var currentLocationIcon = false;
    var searchTimeout = null;
    var terminalIcon = null;
    var homeIcon = null;
    var map = null;
    var terminals = settings.terminals;
    var selected = false;
    var previous_list = false;
    var show_auto_complete = false;

    updateSelection();

    UI.modal.appendTo(document.body);
    UI.terminal_container.insertAfter(UI.hook.parent());
    UI.terminal_container.append(UI.loader, UI.container, UI.show_on_map_btn);//.insertAfter(UI.hook);
    UI.innerContainer.append(UI.search, UI.list, UI.showMore);
    UI.container.append(UI.dropdown, UI.innerContainer);

    // Custom Events to hide/show terminal selector
    $(UI.hook).on('omniva.show', function (e) {
      UI.terminal_container.show();
    });

    $(UI.hook).on('omniva.hide', function (e) {
      UI.terminal_container.hide();
    });

    // Custom Events to search by 
    $(UI.hook).on('omniva.postcode', function (e, postcode) {
      if (!postcode) {
        return;
      }

      UI.search.val(postcode);
      suggest(postcode);
    });

    // Initialize leaflet map
    if (settings.showMap == true) {
      initMap();
    }

    // Generate terminal selector
    refreshList(false);

    // Show on map button to open modal
    UI.show_on_map_btn.on('click', function (e) {
      e.preventDefault();
      showModal();
    });

    // Show on map link inside dropdown
    UI.list.on('click', 'a.show-in-map', function (e) {
      e.preventDefault();
      showModal();
    });

    // Show more link inside dropdown
    UI.showMore.on('click', function (e) {
      e.preventDefault();
      showAll();
    });

    // Dropdown toggle
    UI.dropdown.on('click', function () {
      toggleDropdown();
    });

    // Debounce search input
    UI.search.on('keyup', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () { suggest(UI.search.val()) }, 400);
    });

    // Prevent Enter button inside dropdown
    UI.search.on('keypress', function (event) {
      if (event.which == '13') {
        event.preventDefault();
      }
    });

    // clicking outside dropdown will close it
    $(document).on('mousedown', function (e) {
      if (!UI.container.is(e.target) && UI.container.has(e.target).length === 0 && UI.container.hasClass('open'))
        toggleDropdown();
    });

    // back to list button
    UI.modal.find('.omniva-back-to-list').off('click').on('click', function () {
      listTerminals(terminals, null);
      $(this).hide();
    });


    // initial search by something???
    //searchByAddress();


    function showModal() {
      settings.showMap = true;
      UI.modal.find('.omniva-search input').val(UI.search.val());
      UI.modal.find('.omniva-search button').trigger('click');
      if (selected != false) {
        zoomTo(selected.pos, selected.id);
      }
      UI.modal.show();

      var event;
      if (typeof (Event) === 'function') {
        event = new Event('resize');
      } else {
        event = document.createEvent('Event');
        event.initEvent('resize', true, true);
      }
      window.dispatchEvent(event);
    }

    // for dropdown functionality to show all the terminals
    function showAll() {
      UI.list.find('li').show();
      UI.showMore.hide();
    }

    // rebuilds terminal list inside map modal
    function refreshList(autoselect) {
      UI.modal.find('.omniva-back-to-list').hide();
      var counter = 0;
      var city = false;
      var html = '';
      UI.list.html('');
      UI.modal.find('.found_terminals').html('');
      $(terminals).each(function (i, val) {
        var li = $('<li></li>').prop({ 'data-id': val[3], 'data-pos': [val[1], val[2]] }).text(val[0]);
        if (val['distance'] !== undefined && val['distance'] != false) {
          li.append(' <strong>' + val['distance'] + 'km</strong>');
          counter++;
          if (settings.showMap == true && counter <= settings.maxShow) {
            html += '<li data-pos="[' + [val[1], val[2]] + ']" data-id="' + val[3] + '" ><div><a class="omniva-li">' + counter + '. <b>' + val[0] + '</b></a> <b>' + val['distance'] + ' km.</b>\
                                <div align="left" id="omn-'+ val[3] + '" class="omniva-details" style="display:none;"><small>\
                                '+ val[5] + ' <br/>' + val[6] + '</small><br/>\
                                <button type="button" class="btn-marker" style="font-size:14px; padding:0px 5px;margin-bottom:10px; margin-top:5px;height:25px;" data-id="'+ val[3] + '">' + settings.translate.select_terminal + '</button>\
                                </div>\
                                </div></li>';
          }
        } else {
          if (settings.showMap == true) {
            html += '<li data-pos="[' + [val[1], val[2]] + ']" data-id="' + val[3] + '" ><div><a class="omniva-li">' + (i + 1) + '. <b>' + val[0] + '</b></a>\
                                <div align="left" id="omn-'+ val[3] + '" class="omniva-details" style="display:none;"><small>\
                                '+ val[5] + ' <br/>' + val[6] + '</small><br/>\
                                <button type="button" class="btn-marker" style="font-size:14px; padding:0px 5px;margin-bottom:10px; margin-top:5px;height:25px;" data-id="'+ val[3] + '">' + settings.translate.select_terminal + '</button>\
                                </div>\
                                </div></li>';
          }
        }
        if (selected != false && selected.id == val[3]) {
          li.addClass('selected');
        }
        if (counter > settings.maxShow) {
          li.hide();
        }
        if (val[4] != city) {
          var li_city = $('<li class = "city">' + val[4] + '</li>');
          if (counter > settings.maxShow) {
            li_city.hide();
          }
          UI.list.append(li_city);
          city = val[4];
        }
        UI.list.append(li);
      });
      UI.list.find('li').on('click', function () {
        if (!$(this).hasClass('city')) {
          UI.list.find('li').removeClass('selected');
          $(this).addClass('selected');
          selectOption($(this));
        }
      });
      if (autoselect == true) {
        var first = UI.list.find('li:not(.city):first');
        UI.list.find('li').removeClass('selected');
        first.addClass('selected');
        selectOption(first);
      }

      UI.list.scrollTop(0);
      if (settings.showMap == true) {
        UI.modal.find('.found_terminals').html('<ul class="omniva-terminals-listing" start="1">' + html + '</ul>');
      }
    }

    function selectOption(option) {
      selected = { 'id': option.prop('data-id'), 'text': option.text(), 'pos': option.prop('data-pos'), 'distance': false };
      updateSelection();
      closeDropdown();
    }

    function updateSelection() {
      if (selected != false) {
        UI.dropdown.html(selected.text);
      }
    }

    function toggleDropdown() {
      if (UI.container.hasClass('open')) {
        UI.innerContainer.hide();
        UI.container.removeClass('open')
      } else {
        UI.innerContainer.show();
        UI.innerContainer.find('.search-input').focus();
        UI.container.addClass('open');
      }
    }

    function closeDropdown() {
      if (UI.container.hasClass('open')) {
        UI.innerContainer.hide();
        UI.container.removeClass('open')
      }
    }

    // sorts terminal list by title and resets distance
    function resetList() {
      terminals.sort(function (a, b) {
        a.distance = false;
        b.distance = false;
        return a[0].localeCompare(b[0]);
      });
    }

    function calculateDistance(y, x) {
      $.each(terminals, function (key, location) {
        distance = calcCrow(y, x, location[1], location[2]);
        location['distance'] = distance.toFixed(2);
      });

      terminals.sort(function (a, b) {
        var distOne = a['distance'];
        var distTwo = b['distance'];
        return (parseFloat(distOne) - parseFloat(distTwo));
      });
    }

    function toRad(Value) {
      return Value * Math.PI / 180;
    }

    function calcCrow(lat1, lon1, lat2, lon2) {
      var R = 6371;
      var dLat = toRad(lat2 - lat1);
      var dLon = toRad(lon2 - lon1);
      var lat1 = toRad(lat1);
      var lat2 = toRad(lat2);

      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      var d = R * c;
      return d;
    }

    function resetSelector() {
      resetList();
      UI.showMore.hide();
      refreshList(false);
    }

    function findPosition(address, autoselect) {
      // reset list
      if (address == "") {
        resetSelector();
        return false;
      }

      if (address.length < 3) {
        return false;
      }

      UI.loader.show();
      $.getJSON("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?" + prepAddress({ singleLine: address }) + "&sourceCountry=" + omniva_current_country + "&category=&outFields=Postal&maxLocations=1&forStorage=false&f=pjson", function (data) {
        if (data.candidates != undefined && data.candidates.length > 0) {
          calculateDistance(data.candidates[0].location.y, data.candidates[0].location.x);
          refreshList(autoselect);
          UI.list.prepend(UI.showMapBtn);
          UI.showMore.show();
          if (settings.showMap == true) {
            setCurrentLocation([data.candidates[0].location.y, data.candidates[0].location.x]);
          }
        }
        UI.loader.hide();
      });
    }

    function suggest(address) {
      if (!address) {
        resetSelector();
        return;
      }
      if (address.length < 3) {
        return;
      }
      $.getJSON("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?" + prepAddress({ text: address }) + "&f=pjson&sourceCountry=LT&maxSuggestions=1", function (data) {
        if (data.suggestions != undefined && data.suggestions.length > 0) {
          findPosition(data.suggestions[0].text, false);
        }
      });
    }

    // Prepares address for url (arcgis uses + instead of %20)
    function prepAddress(param) {
      return $.param(param).replace("%20", "+");
    }

    function initMap() {
      //UI.modal.find('.omniva-map-container');//.html('<div id="omnivaMap"></div>');
      var mapEl = $('<div class="omniva-map"></div>')[0];
      UI.modal.find('.omniva-map-container').append(mapEl);
      if (omniva_current_country == "LT") {
        map = L.map(mapEl).setView([54.999921, 23.96472], 8);
      }
      if (omniva_current_country == "LV") {
        map = L.map(mapEl).setView([56.8796, 24.6032], 8);
      }
      if (omniva_current_country == "EE") {
        map = L.map(mapEl).setView([58.7952, 25.5923], 7);
      }
      L.tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.omniva.lt">Omniva</a>'
      }).addTo(map);

      var Icon = L.Icon.extend({
        options: {
          iconSize: [29, 34],
          iconAnchor: [15, 34],
          popupAnchor: [-3, -76]
        }
      });

      var Icon2 = L.Icon.extend({
        options: {
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        }
      });


      terminalIcon = new Icon({ iconUrl: settings.path_to_img + 'sasi.png' });
      homeIcon = new Icon2({ iconUrl: settings.path_to_img + 'locator_img.png' });

      jQuery.each(settings.terminals, function (key, location) {
        L.marker([location[1], location[2]], { icon: terminalIcon, terminalId: location[3] })
          .on('click', function (e) {
            terminalDetails(this.options.terminalId);
            listTerminals(settings.terminals, this.options.terminalId);
          })
          .addTo(map);
      });

      var omnivaSearchFormEl = UI.modal.find('.omniva-search form');
      var omnivaSearchInputEl = omnivaSearchFormEl.find('input');

      omnivaSearchInputEl.off('keyup focus').on('keyup focus', function () {
        clearTimeout(timeoutID);
        show_auto_complete = true;
        timeoutID = setTimeout(function () { autoComplete(omnivaSearchInputEl.val()) }, 500);
      });

      $('.omniva-autocomplete ul').off('click').on('click', 'li', function () {
        omnivaSearchInputEl.val($(this).text());
        omnivaSearchFormEl.trigger('submit');
        $('.omniva-autocomplete').hide();
      });

      // closes autocomplete inside modal
      UI.modal.click(function (e) {
        var container = $(".omniva-autocomplete");
        if (!container.is(e.target) && container.has(e.target).length === 0) {
          container.hide();
        }
      });

      UI.modal.find('.omniva-modal-close').on('click', function () {
        UI.modal.hide();
      });

      omnivaSearchFormEl.off('submit').on('submit', function (e) {
        e.preventDefault();
        var postcode = omnivaSearchInputEl.val();
        findPosition(postcode, false);
        omnivaSearchInputEl.blur();
        show_auto_complete = false;
      });

      $('.found_terminals').on('click', 'li', function () {
        zoomTo(JSON.parse($(this).attr('data-pos')), $(this).attr('data-id'));
      });
      $('.found_terminals').on('click', 'li button', function () {
        terminalSelected($(this).attr('data-id'));
      });

      // populate current position
      getLocation();
    }

    function autoComplete(address) {
      if (!show_auto_complete) {
        return;
      }
      $('.omniva-autocomplete ul').html('');
      $('.omniva-autocomplete').hide();
      if (address == "" || address.length < 3) return false;
      
      $.getJSON("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?" + prepAddress({ text: address }) + "&sourceCountry=" + omniva_current_country + "&f=pjson&maxSuggestions=4", function (data) {
        if (data.suggestions != undefined && data.suggestions.length > 0) {
          $.each(data.suggestions, function (i, item) {
            const li = $("<li data-magickey = '" + item.magicKey + "' data-text = '" + item.text + "'>" + item.text + "</li>");
            $(".omniva-autocomplete ul").append(li);
          });
        }
        if ($(".omniva-autocomplete ul li").length == 0) {
          $(".omniva-autocomplete ul").append('<li>' + settings.translate.place_not_found + '</li>');
        }
        $('.omniva-autocomplete').show();
      });
    }

    function terminalDetails(id) {

      UI.modal.find('.omniva-details').hide();
      id = 'omn-' + id;
      dispOmniva = document.getElementById(id)
      if (dispOmniva) {
        dispOmniva.style.display = 'block';
      }
    }

    function getLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (loc) {
          if (selected == false) {
            setCurrentLocation([loc.coords.latitude, loc.coords.longitude]);
          }
        });
      }
    }

    function setCurrentLocation(pos) {
      if (currentLocationIcon) {
        map.removeLayer(currentLocationIcon);
      }
      currentLocationIcon = L.marker(pos, { icon: homeIcon }).addTo(map);
      map.setView(pos, 16);
    }

    function listTerminals(locations, id) {
      // in case both are falsey ignore call
      if (id === null && !previous_list) {
        return;
      }

      var found_terminals = UI.modal.find('.found_terminals');

      // return to previous list
      if (id === null && previous_list) {
        found_terminals.empty().append(previous_list);
        previous_list = false;
        return;
      }

      if (id) {
        var terminal = found_terminals.find('li[data-id="' + id + '"]');
        // update active marker if this is called from map
        updateActiveMarker(id);
        // check if activated terminal is in shown list
        if (terminal.length > 0) {
          terminal[0].scrollIntoView({ behavior: "smooth" });
          return;
        } else {
          // marker not on list, generate terminal info and enable back to list button
          var html = '';
          if (!previous_list) {
            previous_list = found_terminals.find('.omniva-terminals-listing').detach();
          }
          $('.omniva-back-to-list').show();

          for (var i = 0; i < locations.length; i++) {
            if (locations[i][3] == id) {
              html += '<li data-pos="[' + [locations[i][1], locations[i][2]] + ']" data-id="' + locations[i][3] + '" >' +
                '<div>' +
                '  <a class="omniva-li"><b>' + locations[i][0] + '</b></a>' +
                '  <div align="left" id="omn-' + locations[i][3] + '" class="omniva-details">' +
                '  <small>' + locations[i][5] + ' <br/>' + locations[i][6] + '</small><br/>' +
                '  <button type="button" class="btn-marker" data-id="' + locations[i][3] + '">' + settings.translate.select_terminal + '</button>' +
                '  </div>' +
                '</div></li>';
              break;
            }
          }
          found_terminals.empty().append($('<ul class="omniva-terminals-listing" start="1">' + html + '</ul>'));
        }
      }
    }

    function zoomTo(pos, id) {
      terminalDetails(id);
      map.setView(pos, 14);
      updateActiveMarker(id);
    }

    function updateActiveMarker(id) {
      map.eachLayer(function (layer) {
        if (layer.options.terminalId !== undefined && L.DomUtil.hasClass(layer._icon, "active")) {
          L.DomUtil.removeClass(layer._icon, "active");
        }
        if (layer.options.terminalId == id) {
          L.DomUtil.addClass(layer._icon, "active");
        }
      });
    }

    function terminalSelected(terminal, close) {
      if (close === undefined) {
        close = true;
      }

      for (var i = 0; i < terminals.length; i++) {
        if (terminals[i][3] == terminal) {
          selected = { 'id': terminal, 'text': terminals[i][0], 'pos': [terminals[i][1], terminals[i][2]], 'distance': false };
          updateSelection();
          break;
        }
      }

      if (close) {
        UI.modal.hide();
      }
    }

    return this;
  };

}(jQuery));
