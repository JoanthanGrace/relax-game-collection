import Phaser from 'phaser'

export type PropKind =
  | 'lamp'
  | 'plug'
  | 'socket'
  | 'crate'
  | 'worker'
  | 'cup'
  | 'door'
  | 'parcel'
  | 'truck'
  | 'switch'
  | 'screw'
  | 'battery'
  | 'laptop'
  | 'bag'
  | 'plane'
  | 'mirror'
  | 'knob'
  | 'round'
  | 'round-slot'
  | 'square-slot'

export function createProp(
  scene: Phaser.Scene,
  kind: PropKind,
  x: number,
  y: number,
  width = 64,
  height = 64,
) {
  const bounds = scene.add.rectangle(0, 0, 80, 80).setAlpha(0)
  const art = scene.add.graphics()
  const object = scene.add.container(x, y, [bounds, art]).setScale(width / 80, height / 80)
  const paint = (active = false) => {
    art.clear()
    if (kind === 'lamp') {
      if (active) art.fillStyle(0xffdf73, 0.55).fillTriangle(-22, -13, 30, 27, -32, 27)
      art.lineStyle(7, 0x485d68).lineBetween(0, 26, 10, -3).lineBetween(10, -3, -3, -24)
      art.fillStyle(0x3d7f8b).fillRoundedRect(-25, 26, 50, 7, 3)
      art.fillStyle(0xef705b).fillTriangle(-3, -28, -31, -8, 12, 4)
      art.fillStyle(active ? 0xffe695 : 0xe3c8b2).fillEllipse(-12, -2, 27, 9)
      art.fillStyle(0xf59b85).fillCircle(-3, -25, 5)
    } else if (kind === 'plug') {
      art.lineStyle(7, 0x425962).lineBetween(-29, 31, -18, 22).lineBetween(-18, 22, -4, 18)
      art.lineStyle(6, 0x9daeb5).lineBetween(-11, -12, -11, -34).lineBetween(11, -12, 11, -34)
      art.fillStyle(0x385c73).fillRoundedRect(-23, -17, 46, 38, 10)
      art.fillStyle(0x73a7bc).fillRoundedRect(-17, -12, 34, 9, 4)
    } else if (kind === 'socket') {
      art.fillStyle(0xd2d9de).fillRoundedRect(-34, -31, 68, 65, 8)
      art.fillStyle(0xffffff).fillRoundedRect(-34, -35, 68, 65, 8)
      art.lineStyle(2, 0xa6bac4).strokeRoundedRect(-34, -35, 68, 65, 8)
      art.fillStyle(0x3c5663).fillRoundedRect(-15, -14, 6, 19, 2).fillRoundedRect(9, -14, 6, 19, 2)
      art.fillRoundedRect(-3, 11, 6, 11, 2)
      art.fillStyle(active ? 0x55b291 : 0xbdc7cd).fillCircle(0, -26, 3)
    } else if (kind === 'crate' || kind === 'parcel') {
      art.fillStyle(0x9b653e).fillRoundedRect(-32, -28, 64, 62, 4)
      art.fillStyle(kind === 'crate' ? 0xd4a06a : 0xefbd76).fillRoundedRect(-32, -34, 64, 61, 4)
      art.lineStyle(4, 0xb17b48).strokeRect(-24, -26, 48, 45)
      if (kind === 'crate')
        art.lineStyle(4, 0xb17b48).lineBetween(-21, -23, 21, 16).lineBetween(21, -23, -21, 16)
      else {
        art.fillStyle(0xffe4ae).fillRect(-6, -34, 12, 61)
        art.fillStyle(0xffffff).fillRoundedRect(8, -13, 18, 17, 2)
        art.lineStyle(2, 0x7392a1).lineBetween(11, -7, 23, -7).lineBetween(11, -2, 19, -2)
      }
    } else if (kind === 'worker') {
      art.fillStyle(0x4a7086).fillEllipse(0, 28, 39, 12)
      art.fillStyle(0xee705d).fillRoundedRect(-17, 2, 34, 29, 8)
      art.fillStyle(0xf4d2b5).fillCircle(0, -10, 19)
      art.fillStyle(0xf1c75b).fillRoundedRect(-21, -31, 42, 17, 7).fillRect(-25, -18, 50, 6)
      art.fillStyle(0x364754).fillCircle(-6, -8, 2).fillCircle(6, -8, 2)
      art.lineStyle(2, 0x995a4b).lineBetween(-4, 0, 4, 0)
    } else if (kind === 'cup') {
      art.lineStyle(6, 0x5d91a3).strokeEllipse(23, 4, 22, 28)
      art.fillStyle(0x77afc0).fillRoundedRect(-24, -20, 49, 49, 8)
      art.fillStyle(0xedf6f5).fillEllipse(0, -20, 49, 17)
      art.fillStyle(active ? 0x60bcd3 : 0xced9dc).fillEllipse(0, -20, 39, 9)
      art.fillStyle(0xbfe1e7).fillRoundedRect(-18, -8, 8, 20, 3)
    } else if (kind === 'door') {
      art.fillStyle(0x567887).fillRoundedRect(-28, -37, 56, 73, 4)
      art.fillStyle(active ? 0x9bcbbb : 0xeaa87b).fillRect(-22, -31, 44, 67)
      art.fillStyle(0xfff3bd).fillCircle(12, 8, 4)
      art.fillStyle(0x8d9fa5).fillRect(-33, 32, 66, 6)
    } else if (kind === 'truck') {
      art.fillStyle(0xf0c660).fillRoundedRect(-34, -19, 43, 39, 4)
      art.fillStyle(0xe96c58).fillRoundedRect(9, -6, 26, 26, 4)
      art.fillStyle(0xd3ebef).fillRect(16, -1, 12, 11)
      art.fillStyle(0x354c5c).fillCircle(-19, 22, 8).fillCircle(23, 22, 8)
      art.fillStyle(0xc3d8dd).fillCircle(-19, 22, 3).fillCircle(23, 22, 3)
    } else if (kind === 'switch') {
      art.fillStyle(0xd7e0e3).fillRoundedRect(-27, -34, 54, 68, 6)
      art.fillStyle(0xffffff).fillRoundedRect(-27, -37, 54, 68, 6)
      art.fillStyle(active ? 0x69b69d : 0x8399a5).fillRoundedRect(-15, -20, 30, 39, 4)
      art.fillStyle(0xe8f1ef).fillRect(-10, active ? 8 : -14, 20, 5)
    } else if (kind === 'battery') {
      art.fillStyle(0x405965).fillRoundedRect(-37, -23, 66, 46, 5).fillRect(29, -10, 8, 20)
      art.fillStyle(active ? 0x8acdb3 : 0xe4ad64).fillRoundedRect(-31, -17, active ? 54 : 12, 34, 3)
      art.lineStyle(3, 0xffffff).lineBetween(14, -6, 14, 6).lineBetween(8, 0, 20, 0)
    } else if (kind === 'laptop') {
      art.fillStyle(0x466c7f).fillRoundedRect(-31, -30, 62, 43, 4)
      art.fillStyle(0xb1dce3).fillRect(-25, -24, 50, 31)
      art
        .fillStyle(0xd2dce1)
        .fillTriangle(-31, 13, -38, 30, 38, 30)
        .fillTriangle(-31, 13, 31, 13, 38, 30)
      art.fillStyle(0x6c929e).fillRoundedRect(-20, 17, 40, 6, 2)
    } else if (kind === 'bag') {
      art.lineStyle(6, 0x4d6b78).strokeRoundedRect(-15, -32, 30, 19, 6)
      art.fillStyle(0x639b9e).fillRoundedRect(-33, -19, 66, 50, 6)
      art.fillStyle(0x98c4be).fillRoundedRect(-28, -16, 56, 17, 4)
      art.fillStyle(0xf2cd78).fillRect(-5, -3, 10, 8)
    } else if (kind === 'plane') {
      art.fillStyle(0x99bfcf).fillTriangle(-35, 30, 33, -33, -8, 33)
      art.fillStyle(0xffffff).fillTriangle(-35, 30, 33, -33, -29, -4)
      art.fillStyle(0xdceaf0).fillTriangle(-8, 33, 33, -33, 35, 17)
      art.lineStyle(2, 0x749aad).lineBetween(-8, 33, 33, -33)
    } else if (kind === 'mirror') {
      art.fillStyle(0x739cb0).fillRoundedRect(-30, -37, 60, 74, 8)
      art.fillStyle(0xc4e7ed).fillRoundedRect(-25, -32, 50, 64, 5)
      art.lineStyle(4, 0xf3fbfc).lineBetween(-17, 8, 12, -20).lineBetween(-13, 19, 17, -11)
    } else if (kind === 'knob') {
      art.fillStyle(0x5d7888).fillCircle(0, 3, 30)
      art.fillStyle(0xf1cc73).fillCircle(0, 0, 30)
      art.fillStyle(0xffe6a7).fillCircle(-6, -7, 18)
      art.lineStyle(4, 0x806d45).lineBetween(0, -22, 0, -9)
    } else if (kind === 'round') {
      art.fillStyle(0xb37163).fillCircle(0, 4, 31)
      art.fillStyle(0xee9983).fillCircle(0, 0, 31)
      art.fillStyle(0xf9bea8).fillEllipse(-8, -12, 23, 10)
    } else if (kind === 'round-slot' || kind === 'square-slot') {
      art.fillStyle(0xbacdd4).fillRoundedRect(-36, -36, 72, 72, 4)
      art.fillStyle(0x657e89)
      if (kind === 'round-slot') art.fillCircle(0, 0, 28)
      else art.fillRect(-25, -25, 50, 50)
    } else {
      art.fillStyle(0x8199a5).fillCircle(0, 4, 29)
      art.fillStyle(0xbdcbd1).fillCircle(0, 0, 29)
      art.lineStyle(6, 0x5d727e).lineBetween(-15, -15, 15, 15)
    }
  }
  paint()
  object.setData('paintActive', paint)
  object.setInteractive(new Phaser.Geom.Rectangle(-40, -40, 80, 80), Phaser.Geom.Rectangle.Contains)
  return object
}
