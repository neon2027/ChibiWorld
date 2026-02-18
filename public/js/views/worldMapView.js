import { navigate } from '../router.js';

export function renderWorldMap(container) {
    container.innerHTML = `
    <div class="worldmap-wrap">
        <div class="worldmap-header">
            <h2>🗺 World Map</h2>
            <span class="worldmap-subtitle">Click a zone to travel there</span>
        </div>
        <div class="worldmap-viewport">
            <svg class="worldmap-svg" viewBox="0 0 960 780" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="map-glow-pink" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="map-shadow">
                        <feDropShadow dx="1" dy="1" stdDeviation="2" flood-opacity="0.25"/>
                    </filter>
                    <linearGradient id="trackGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#72c86a"/>
                        <stop offset="100%" stop-color="#58a852"/>
                    </linearGradient>
                    <linearGradient id="fieldGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#5ec45e"/>
                        <stop offset="100%" stop-color="#48a848"/>
                    </linearGradient>
                    <linearGradient id="parkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#c8dba8"/>
                        <stop offset="100%" stop-color="#b4cc90"/>
                    </linearGradient>
                </defs>

                <!-- ===== BACKGROUND ===== -->
                <rect width="960" height="780" fill="#e8e3da"/>

                <!-- ===== CITY BLOCK FILLS (background urban texture) ===== -->
                <!-- Top-left area blocks -->
                <rect x="0"   y="0"   width="62"  height="135" fill="#ddd8cf"/>
                <rect x="0"   y="150" width="62"  height="340" fill="#ddd8cf"/>
                <!-- Top area above Bicol 630 -->
                <rect x="330" y="0"   width="55"  height="62"  fill="#ddd8cf"/>
                <rect x="397" y="0"   width="68"  height="62"  fill="#ddd8cf"/>
                <rect x="477" y="0"   width="55"  height="62"  fill="#ddd8cf"/>
                <!-- Top-right area blocks -->
                <rect x="680" y="0"   width="110" height="62"  fill="#ddd8cf"/>
                <rect x="794" y="0"   width="166" height="50"  fill="#ddd8cf"/>
                <!-- Right side blocks -->
                <rect x="680" y="96"  width="110" height="85"  fill="#ddd8cf"/>
                <rect x="794" y="96"  width="110" height="80"  fill="#ddd8cf"/>
                <rect x="910" y="96"  width="50"  height="280" fill="#ddd8cf"/>
                <rect x="680" y="215" width="110" height="65"  fill="#ddd8cf"/>
                <!-- Right side lower blocks -->
                <rect x="635" y="535" width="155" height="90"  fill="#ddd8cf"/>
                <rect x="795" y="535" width="115" height="65"  fill="#ddd8cf"/>
                <rect x="635" y="635" width="100" height="80"  fill="#ddd8cf"/>
                <rect x="740" y="655" width="100" height="70"  fill="#ddd8cf"/>
                <!-- Bottom area blocks -->
                <rect x="330" y="625" width="100" height="80"  fill="#ddd8cf"/>
                <rect x="440" y="615" width="120" height="80"  fill="#ddd8cf"/>
                <!-- Left lower blocks -->
                <rect x="0"   y="700" width="62"  height="80"  fill="#ddd8cf"/>
                <rect x="88"  y="680" width="75"  height="65"  fill="#ddd8cf"/>
                <rect x="88"  y="620" width="75"  height="50"  fill="#ddd8cf"/>

                <!-- ===== ROADS ===== -->
                <!-- BU Main Campus Rd — left vertical -->
                <rect x="62" y="0" width="26" height="495" fill="#bfb9af"/>

                <!-- BU Main Campus Rd — curves bottom-left -->
                <path d="M62 490 Q48 538 28 568 L0 618 L0 650 L32 600 Q56 566 70 516 L70 490 Z" fill="#bfb9af"/>

                <!-- Bicol 630 — top horizontal -->
                <rect x="330" y="62" width="348" height="24" rx="2" fill="#bfb9af"/>

                <!-- Rizal St — diagonal from Bicol 630 junction, top-right going down -->
                <path d="M537 62 L561 62 L960 452 L960 476 L537 86 Z" fill="#bfb9af"/>

                <!-- EMa Barrio S — right edge vertical -->
                <rect x="912" y="452" width="22" height="328" fill="#bfb9af"/>

                <!-- Road above rectangular field (connects BU Main Campus Rd east) -->
                <rect x="88" y="188" width="446" height="22" fill="#bfb9af"/>

                <!-- Vertical cross road (right of oval, left of field) -->
                <rect x="415" y="188" width="22" height="400" fill="#bfb9af"/>

                <!-- Bottom horizontal road -->
                <rect x="88" y="590" width="826" height="22" fill="#bfb9af"/>

                <!-- Road connecting bottom of oval area to bottom-right -->
                <path d="M88 450 Q200 470 380 488 L380 508 Q200 490 88 470 Z" fill="#bfb9af"/>

                <!-- Short road segment top of oval to Bicol 630 -->
                <rect x="88" y="62" width="130" height="24" rx="2" fill="#bfb9af"/>

                <!-- Road at top-right diagonal (short connector) -->
                <path d="M680 62 L700 62 L700 90 L680 90 Z" fill="#bfb9af"/>

                <!-- ===== HERITAGE PARK (top right) ===== -->
                <rect x="795" y="54" width="160" height="130" rx="4" fill="url(#parkGrad)" filter="url(#map-shadow)"/>
                <rect x="795" y="54" width="160" height="130" rx="4" fill="none" stroke="#96ba78" stroke-width="1.5"/>
                <!-- park grid dots texture -->
                <line x1="835" y1="54" x2="835" y2="184" stroke="#88ac6a" stroke-width="0.5" opacity="0.5"/>
                <line x1="875" y1="54" x2="875" y2="184" stroke="#88ac6a" stroke-width="0.5" opacity="0.5"/>
                <line x1="915" y1="54" x2="915" y2="184" stroke="#88ac6a" stroke-width="0.5" opacity="0.5"/>
                <line x1="795" y1="94"  x2="955" y2="94"  stroke="#88ac6a" stroke-width="0.5" opacity="0.5"/>
                <line x1="795" y1="134" x2="955" y2="134" stroke="#88ac6a" stroke-width="0.5" opacity="0.5"/>

                <!-- ===== OVAL TRACK (THE KEY FEATURE) ===== -->
                <!-- Shadow under oval -->
                <ellipse cx="268" cy="305" rx="151" ry="232" fill="rgba(0,0,0,0.12)"/>
                <!-- Outer track strip (green ring) -->
                <ellipse cx="265" cy="302" rx="150" ry="230" fill="url(#trackGrad)"/>
                <!-- Inner infield grass -->
                <ellipse cx="265" cy="302" rx="108" ry="186" fill="#bcd990"/>
                <!-- Infield center lighter zone -->
                <ellipse cx="265" cy="302" rx="80"  ry="158" fill="#c8e098"/>
                <!-- Track outer edge line -->
                <ellipse cx="265" cy="302" rx="150" ry="230" fill="none" stroke="#48984a" stroke-width="2.5"/>
                <!-- Track inner edge line -->
                <ellipse cx="265" cy="302" rx="108" ry="186" fill="none" stroke="#48984a" stroke-width="2"/>
                <!-- Lane dividers (dashed) -->
                <ellipse cx="265" cy="302" rx="120" ry="198" fill="none" stroke="#60a858" stroke-width="1" stroke-dasharray="8 6"/>
                <ellipse cx="265" cy="302" rx="132" ry="212" fill="none" stroke="#60a858" stroke-width="1" stroke-dasharray="8 6"/>
                <!-- Straight sections markers -->
                <line x1="115" y1="302" x2="123" y2="302" stroke="#ffffffaa" stroke-width="3"/>
                <line x1="407" y1="302" x2="415" y2="302" stroke="#ffffffaa" stroke-width="3"/>

                <!-- ===== RECTANGULAR GREEN FIELD ===== -->
                <!-- Shadow -->
                <rect x="440" y="215" width="205" height="230" rx="3" fill="rgba(0,0,0,0.1)"/>
                <!-- Field fill -->
                <rect x="437" y="212" width="205" height="230" rx="3" fill="url(#fieldGrad)"/>
                <!-- Field border -->
                <rect x="437" y="212" width="205" height="230" rx="3" fill="none" stroke="#389038" stroke-width="2.5"/>
                <!-- Center line vertical -->
                <line x1="539" y1="212" x2="539" y2="442" stroke="#389038" stroke-width="1.5"/>
                <!-- Center line horizontal -->
                <line x1="437" y1="327" x2="642" y2="327" stroke="#389038" stroke-width="1.5"/>
                <!-- Center circle -->
                <circle cx="539" cy="327" r="28" fill="none" stroke="#389038" stroke-width="1.5"/>
                <!-- Goal boxes -->
                <rect x="488" y="212" width="102" height="28" fill="none" stroke="#389038" stroke-width="1.2"/>
                <rect x="488" y="414" width="102" height="28" fill="none" stroke="#389038" stroke-width="1.2"/>

                <!-- ===== WATER / RIVER (bottom-left) ===== -->
                <path d="M0 645 Q55 622 118 645 Q182 668 248 642 Q296 624 338 645 L338 700 Q296 682 248 700 Q182 724 118 700 Q55 678 0 700 Z" fill="#7ecde0" opacity="0.88"/>
                <!-- River shimmer lines -->
                <path d="M30 660 Q80 652 130 660" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>
                <path d="M60 680 Q110 672 160 680 Q200 688 240 680" fill="none" stroke="white" stroke-width="1.5" opacity="0.4"/>

                <!-- ===== BUILDINGS ===== -->
                <!-- Multi-Purpose Building -->
                <rect x="530" y="98"  width="120" height="56" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- College of Arts and Letters -->
                <rect x="495" y="162" width="86"  height="52" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- Small building top-left of oval -->
                <rect x="112" y="98"  width="58"  height="38" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <!-- BU Grandstand (left of oval) -->
                <rect x="112" y="395" width="68"  height="28" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- PhilFIDA (below oval) -->
                <rect x="232" y="508" width="75"  height="38" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- CHED (right side) -->
                <rect x="792" y="548" width="98"  height="58" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- Science Building -->
                <rect x="395" y="622" width="100" height="48" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- Nursing Building -->
                <rect x="505" y="622" width="95"  height="48" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- Serenity Touch (top right area) -->
                <rect x="900" y="110" width="42"  height="35" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <!-- Building cluster bottom right -->
                <rect x="648" y="545" width="65"  height="42" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <rect x="720" y="548" width="55"  height="38" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <rect x="650" y="655" width="70"  height="42" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <rect x="726" y="658" width="55"  height="38" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>
                <!-- Chemistry/Biology dept -->
                <rect x="368" y="692" width="82"  height="42" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1" filter="url(#map-shadow)"/>
                <!-- Kem's Ongpin area -->
                <rect x="458" y="98"  width="62"  height="38" rx="2" fill="#d4cec6" stroke="#b8b2a8" stroke-width="1"/>

                <!-- ===== ROAD LABELS ===== -->
                <text x="503" y="56"  text-anchor="middle" fill="#888078" font-size="11" font-style="italic" font-family="sans-serif">Bicol 630</text>
                <text x="780" y="252" text-anchor="middle" fill="#888078" font-size="11" font-style="italic" font-family="sans-serif" transform="rotate(-26,780,252)">Rizal St</text>
                <text x="40"  y="320" text-anchor="middle" fill="#888078" font-size="10" font-style="italic" font-family="sans-serif" transform="rotate(-90,40,320)">BU Main Campus Rd</text>
                <text x="695" y="580" fill="#888078" font-size="10" font-style="italic" font-family="sans-serif" transform="rotate(-90,695,580)">EMa Barrio S</text>

                <!-- ===== ZONE / LANDMARK LABELS ===== -->
                <!-- Heritage Park label -->
                <text x="875" y="106" text-anchor="middle" fill="#446030" font-size="10" font-weight="bold" font-family="sans-serif">Bicol Heritage Park</text>
                <text x="875" y="120" text-anchor="middle" fill="#567a40" font-size="9"  font-family="sans-serif">Green space with</text>
                <text x="875" y="132" text-anchor="middle" fill="#567a40" font-size="9"  font-family="sans-serif">various monuments</text>

                <!-- Oval campus label -->
                <text x="265" y="290" text-anchor="middle" fill="#204a20" font-size="13" font-weight="bold" font-family="sans-serif">Bicol University,</text>
                <text x="265" y="306" text-anchor="middle" fill="#204a20" font-size="12" font-family="sans-serif">West (Main Campus)</text>

                <!-- Grandstand label -->
                <text x="135" y="390" fill="#4a4a8a" font-size="9" font-weight="bold" font-family="sans-serif">BU Grandstand</text>

                <!-- PhilFIDA label -->
                <text x="270" y="534" text-anchor="middle" fill="#4a4a8a" font-size="9" font-weight="bold" font-family="sans-serif">PhilFIDA</text>

                <!-- Multi-purpose building -->
                <text x="590" y="122" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Multi-Purpose</text>
                <text x="590" y="134" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Building</text>

                <!-- Arts and Letters -->
                <text x="538" y="183" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">College of Arts</text>
                <text x="538" y="195" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">and Letters</text>

                <!-- CHED label -->
                <text x="841" y="570" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Commission on</text>
                <text x="841" y="582" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Higher Education</text>

                <!-- Science Building -->
                <text x="445" y="643" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">BU Science</text>
                <text x="445" y="655" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Building 2</text>

                <!-- Nursing Building -->
                <text x="552" y="643" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">BU Nursing</text>
                <text x="552" y="655" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Building</text>

                <!-- Chemistry dept -->
                <text x="409" y="711" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Chemistry and</text>
                <text x="409" y="723" text-anchor="middle" fill="#555" font-size="8.5" font-family="sans-serif">Biology Dept</text>

                <!-- Kem's Ongpin -->
                <text x="489" y="119" text-anchor="middle" fill="#c06020" font-size="9" font-family="sans-serif">Kem's Ongpin</text>
                <text x="489" y="131" text-anchor="middle" fill="#c06020" font-size="9" font-family="sans-serif">Batchoy House</text>

                <!-- Serenity Touch -->
                <text x="835" y="160" fill="#806050" font-size="8.5" font-family="sans-serif">Serenity Touch</text>
                <text x="835" y="172" fill="#806050" font-size="8.5" font-family="sans-serif">Massage &amp; Spa</text>

                <!-- ===== CLICKABLE ZONE HOTSPOTS (transparent overlays) ===== -->
                <!-- Oval Track Zone → Plaza -->
                <ellipse
                    cx="265" cy="302" rx="150" ry="230"
                    fill="transparent"
                    class="zone-hotspot"
                    data-zone="#/plaza"
                    data-label="Training Grounds — Go to Plaza"
                    style="cursor:pointer"
                />
                <!-- Rectangular Field Zone → Room Browser -->
                <rect
                    x="437" y="212" width="205" height="230" rx="3"
                    fill="transparent"
                    class="zone-hotspot"
                    data-zone="#/rooms"
                    data-label="Sports Field — Browse Rooms"
                    style="cursor:pointer"
                />
                <!-- Heritage Park → My Room -->
                <rect
                    x="795" y="54" width="160" height="130" rx="4"
                    fill="transparent"
                    class="zone-hotspot"
                    data-zone="#/my-room"
                    data-label="Heritage Park — My Room"
                    style="cursor:pointer"
                />

                <!-- ===== PLAYER POSITION MARKER ===== -->
                <!-- Pulse ring -->
                <circle id="playerPulse" cx="265" cy="302" r="10" fill="none" stroke="#ff7eb3" stroke-width="2.5" opacity="0.7">
                    <animate attributeName="r"       from="10" to="24"  dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.7" to="0"  dur="1.6s" repeatCount="indefinite"/>
                </circle>
                <!-- Dot -->
                <circle id="playerDot" cx="265" cy="302" r="7" fill="#ff7eb3" stroke="white" stroke-width="2.5" filter="url(#map-glow-pink)"/>
                <!-- You label -->
                <text x="265" y="325" text-anchor="middle" fill="#ff7eb3" font-size="10" font-weight="bold" font-family="sans-serif">You</text>
            </svg>

            <!-- Zone tooltip -->
            <div class="map-tooltip hidden" id="mapTooltip"></div>
        </div>
    </div>
    `;

    // Zone hover + click handlers
    container.querySelectorAll('.zone-hotspot').forEach(el => {
        el.addEventListener('mouseenter', () => {
            el.style.fill = 'rgba(255,126,179,0.18)';
            el.style.stroke = '#ff7eb3';
            el.style.strokeWidth = '2.5';
        });
        el.addEventListener('mouseleave', () => {
            const tooltip = container.querySelector('#mapTooltip');
            if (tooltip) tooltip.classList.add('hidden');
            el.style.fill = 'transparent';
            el.style.stroke = '';
        });
        el.addEventListener('mousemove', (e) => {
            const tooltip = container.querySelector('#mapTooltip');
            if (!tooltip) return;
            tooltip.textContent = el.dataset.label;
            tooltip.classList.remove('hidden');
            const wrap = container.querySelector('.worldmap-viewport');
            const rect = wrap.getBoundingClientRect();
            tooltip.style.left = (e.clientX - rect.left + 14) + 'px';
            tooltip.style.top  = (e.clientY - rect.top  - 36) + 'px';
        });
        el.addEventListener('click', () => {
            const zone = el.dataset.zone;
            if (zone) navigate(zone);
        });
    });
}

export function destroyWorldMap() {}
