import Phaser from 'phaser'

export const AMEI_TEXTURE = 'amei-teammate-v1'

export function createToyCloudScene(scene: Phaser.Scene) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scene.cameras.main.setBackgroundColor('#e8f3f8')
  const backdrop = scene.add.graphics()
  backdrop.fillStyle(0xaacdc2).fillRoundedRect(24, 529, 352, 49, 12)
  backdrop.fillStyle(0xcde2d4).fillRoundedRect(24, 520, 352, 43, 12)
  backdrop.fillStyle(0xefb3a1).fillRoundedRect(49, 483, 45, 38, 3)
  backdrop.fillStyle(0xdd7867).fillTriangle(44, 484, 71, 461, 98, 484)
  backdrop.fillStyle(0xfaf5df).fillRoundedRect(65, 498, 12, 23, 3)
  backdrop.lineStyle(3, 0x73a992).lineBetween(329, 520, 329, 489)
  backdrop.fillStyle(0xf3c24d).fillCircle(329, 488, 10)
  backdrop.fillStyle(0xffefad).fillCircle(329, 488, 4)
  const label = scene.add
    .text(200, 44, '阿妹的天气实验', {
      fontSize: '14px',
      color: '#63828e',
      fontFamily: 'sans-serif',
    })
    .setOrigin(0.5)

  const sunArt = scene.add.graphics()
  sunArt.lineStyle(7, 0xf1b73b, 1)
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6
    sunArt.lineBetween(
      Math.cos(angle) * 58,
      Math.sin(angle) * 58,
      Math.cos(angle) * 69,
      Math.sin(angle) * 69,
    )
  }
  sunArt.fillStyle(0xe7aa31).fillCircle(0, 5, 45)
  sunArt.fillStyle(0xffd55c).fillCircle(0, 0, 45)
  sunArt.fillStyle(0xffe697).fillEllipse(-13, -18, 30, 13)
  sunArt.fillStyle(0x3d4241).fillCircle(-13, -2, 3).fillCircle(13, -2, 3)
  sunArt.lineStyle(3, 0x3d4241).lineBetween(-7, 12, 0, 16).lineBetween(0, 16, 7, 12)
  const sun = scene.add.container(200, 210, [sunArt])

  const cloudArt = scene.add.graphics()
  const drawCloud = (color: number, offset: number) => {
    cloudArt.fillStyle(color)
    cloudArt.fillRoundedRect(-72, -14 + offset, 144, 52, 24)
    cloudArt.fillCircle(-38, -9 + offset, 31)
    cloudArt.fillCircle(0, -29 + offset, 38)
    cloudArt.fillCircle(38, -11 + offset, 30)
  }
  drawCloud(0x99abb6, 6)
  drawCloud(0xc1ced8, 0)
  cloudArt.fillStyle(0xdfe7ec).fillEllipse(-11, -40, 39, 13)
  cloudArt.lineStyle(3, 0x53636e).lineBetween(-25, -3, -14, -3).lineBetween(14, -3, 25, -3)
  cloudArt.lineBetween(-7, 18, 0, 15).lineBetween(0, 15, 7, 18)
  const cloudBounds = scene.add.rectangle(0, -11.5, 144, 111).setAlpha(0)
  const cloud = scene.add.container(200, 210, [cloudBounds, cloudArt])
  cloud.setInteractive(
    new Phaser.Geom.Rectangle(-72, -67, 144, 111),
    Phaser.Geom.Rectangle.Contains,
  )

  // Use a textured image inside a container so the config-driven engine can animate it like other objects.
  const dogImage = scene.add.image(0, 0, AMEI_TEXTURE).setDisplaySize(176, 176)
  const dog = scene.add.container(200, 441, [dogImage])
  const speech = scene.add
    .text(200, 310, '我把太阳藏好了……啊不，云挡住了。', {
      fontSize: '14px',
      color: '#46636e',
      fontFamily: 'sans-serif',
      align: 'center',
      wordWrap: { width: 330 },
    })
    .setOrigin(0.5)
  const footer = scene.add
    .text(200, 561, '王阿妹 · 热心但不太靠谱', {
      fontSize: '12px',
      color: '#467366',
      fontFamily: 'sans-serif',
    })
    .setOrigin(0.5)
  label.setDepth(-2)
  backdrop.setDepth(-3)
  footer.setDepth(2)
  if (!reducedMotion)
    scene.tweens.add({
      targets: sun,
      angle: { from: -4, to: 4 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

  return {
    objects: { cloud, 'hidden-sun': sun, 'sad-face': dog, 'complaint-text': speech },
    celebrate() {
      speech.setText('太阳出来了！阿妹先晒一会儿。')
      cloud.disableInteractive()
      if (!reducedMotion) {
        scene.tweens.add({
          targets: dog,
          y: 429,
          angle: { from: -5, to: 5 },
          duration: 160,
          yoyo: true,
          repeat: 2,
        })
        scene.tweens.add({ targets: sun, scaleX: 1.08, scaleY: 1.08, duration: 230, yoyo: true })
      }
    },
  }
}
