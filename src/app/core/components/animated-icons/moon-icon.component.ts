import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'app-moon-icon',
	standalone: true,
	template: `
		<div class="moon" [class.animate]="animate">
			<svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path class="crescent" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
			</svg>
		</div>
	`,
	styles: [
		`:host{display:inline-block;line-height:0}
		.moon{display:inline-flex;align-items:center;justify-content:center}
		.moon svg{overflow:visible}

		/* performance hint */
		.moon .crescent { will-change: transform, opacity; transform-origin: 12px 12px; }

		/* continuous subtle rocking movement */
		.moon.animate .crescent { animation: moon-sway 1200ms ease-in-out infinite; }

		@keyframes moon-sway {
			0% { transform: rotate(0deg); }
			20% { transform: rotate(-10deg); }
			40% { transform: rotate(10deg); }
			60% { transform: rotate(-5deg); }
			80% { transform: rotate(5deg); }
			100% { transform: rotate(0deg); }
		}
		`
	]
})
export class MoonIconComponent {
	@Input() size = 28;
    @Input() color = 'currentColor';
    

	animate = true; // animate continuously by default

	@Output() animationStarted = new EventEmitter<void>();
	@Output() animationStopped = new EventEmitter<void>();

	startAnimation(): void {
		this.animate = true;
		this.animationStarted.emit();
	}

	stopAnimation(): void {
		this.animate = false;
		this.animationStopped.emit();
	}
}

