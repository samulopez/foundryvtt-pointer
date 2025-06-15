import CONSTANTS from "../constants";

export class Pointer extends PIXI.Container {
  constructor(data = {}, userId = game.userId, gridSize = canvas.grid?.size) {
    super();
    this.data = foundry.utils.duplicate(foundry.utils.expandObject(data)); //{gridSize: data.gridSize};

    this.userId = userId;
    this.gridSize = gridSize;
    this.draw();
  }

  static get defaultSettings() {
    return this.default("pointer");
  }

  async draw(newData = this.data) {
    if (this._drawing) {
      return;
    }
    this._drawing = true;
    const data = this.data;
    if (newData.img) {
      if (this.sprite) {
        this.sprite.destroy();
      }
      const tex = await foundry.canvas.loadTexture(data.img);
      this.sprite = this.addChild(new PIXI.Sprite(tex));

      const src = tex.baseTexture.resource.source; // .cloneNode()
      if (src.tagName === "VIDEO") {
        src.loop = true;
        src.muted = true;
        game.video.play(src);
      }
      const { height, width } = tex;

      this.sprite.pivot.x = width / 2;
      this.sprite.pivot.y = height / 2;
      newData = this.data;
    }

    if (newData.position) {
      this.position = data.position;
      delete data.position;
    }

    if (newData.scale) {
      const { height, width } = this.sprite.texture;
      const ratio = height / width;
      this.sprite.scale = new PIXI.Point(
        (this.gridSize / width) * data.scale,
        (this.gridSize / height) * data.scale * ratio,
      );
    }

    if (newData.offset) {
      this.sprite.position = new PIXI.Point(
        data.offset.x * this.gridSize * data.scale,
        data.offset.y * this.gridSize * data.scale,
      );
    }

    if (newData.angle) {
      this.sprite.angle = data.angle;
    }

    if (newData.tint) {
      if (this.data.tint.useUser) {
        if (foundry.utils.isNewerVersion(game.version, 12)) {
          this.sprite.tint = Number("0x" + game.users.get(this.userId).color.css.slice(1));
        } else {
          this.sprite.tint = Number("0x" + game.users.get(this.userId).color.slice(1));
        }
      } else {
        this.sprite.tint = Number("0x" + data.tint.color.slice(1));
      }
    }

    if (newData.animations) {
      this.animations = newData.animations;
      if (this.timeline) {
        this.timeline.clear();
      } else {
        this.timeline = gsap.timeline();
      }
      if (this.animations?.rotation?.use) {
        const rotData = this.animations.rotation;
        const min = rotData.min,
          max = rotData.max,
          dur = rotData.dur,
          yoyo = rotData.yoyo,
          ease = rotData.easing.method === "none" ? "none" : rotData.easing.method + "." + rotData.easing.type;
        this.timeline.set(this, { angle: min }, 0);
        this.timeline.to(this, dur, { angle: max, ease, repeat: -1, yoyo }, 0);
      } else {
        this.rotation = 0;
      }
      if (this.animations?.scale?.use) {
        const scaleData = this.animations.scale;
        const min = scaleData.min,
          max = scaleData.max,
          dur = scaleData.dur,
          yoyo = scaleData.yoyo,
          ease = scaleData.easing.method === "none" ? null : scaleData.easing.method + "." + scaleData.easing.type;
        this.timeline.set(this.scale, { x: min, y: min }, 0);
        this.timeline.to(this.scale, dur, { x: max, y: max, ease, repeat: -1, yoyo }, 0);
      } else {
        this.scale = new PIXI.Point(1, 1);
      }

      this.timeline.play();
    }

    this._drawing = false;
  }

  async update(udata) {
    this.data = foundry.utils.mergeObject(this.data, foundry.utils.duplicate(udata));
    await this.draw(foundry.utils.expandObject(this.data));

    return;
  }

  async save() {
    // do update stuff here
    const collection = foundry.utils.duplicate(game.settings.get(CONSTANTS.MODULE_ID, "collection"));
    let idx = collection.findIndex((e) => e.id === this.id);
    const data = foundry.utils.duplicate(this.data);
    delete data.position;
    collection[idx] = data;
    return game.settings.set(CONSTANTS.MODULE_ID, "collection", collection);
  }

  hide() {
    this.renderable = false;
  }

  ping(position) {
    return;
  }

  destroy(...args) {
    super.destroy(...args);
    this.timeline?.kill();
  }
}

export class Ping extends Pointer {
  async draw(newData) {
    this.renderable = true;
    await super.draw(newData);
    if (newData?.position) {
      if (!this.timeline) this.timeline = gsap.timeline();

      const removeTween = this.timeline.getById("remove");
      if (removeTween) {
        this.timeline.remove(removeTween);
      }
      this.timeline.set(
        this,
        {
          id: "remove",
          onComplete: () => {
            this.renderable = false;
            this.timeline.pause();
          },
        },
        this.pingDuration || 3,
      );

      this.timeline.restart();
    } else this.renderable = false;
  }
}
