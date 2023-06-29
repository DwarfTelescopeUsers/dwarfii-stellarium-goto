import styles from "@/components/imaging/AstroSettingsInfo.module.css";

type PropTypes = {
  onClick: any;
};

export default function AstroSettingsInfo(props: PropTypes) {
  const { onClick } = props;

  return (
    <div className={styles.settings}>
      <div className="fs-5 mb-2" role="button" onClick={onClick}>
        <i className="bi bi-arrow-left-circle"></i> Back
      </div>
      <dl>
        <dt>Gain</dt>
        <dd>
          Gain is a digital camera setting that controls the amplification of
          the signal from the camera sensor. It should be noted that this
          amplifies the whole signal, including any associated background noise.
        </dd>
        <dt>Exposure</dt>
        <dd>
          Time during which the sensor will be exposed to light and capturing
          information (energy).
        </dd>
        <dt>IR (infrared) - Pass</dt>
        <dd>
          Allows the infrared wavelength to reach the sensor. Several
          astronomical objects emit in this wavelength.
        </dd>
        <dt>IR (infrared) - Cut</dt>
        <dd>Blocks infrared wavelength. Useful for lunar and planetary.</dd>
        <dt>Binning - 1x1</dt>
        <dd>Camera captures light on each individual physical pixel.</dd>
        <dt>Binning - 2x2</dt>
        <dd>
          Camera combines physical pixels in groups of 2x2 (4 pixels) and
          considers all light captured in the group as a single pixel. Can be
          considered a &quot;virtual&quot; pixel. This makes pixel size larger
          and reduces resolution by a factor equal to the binning.
        </dd>
        <dt>Format - FITS</dt>
        <dd>
          Astronomy lossless numerical file format. Can include meta data of the
          image (coordinates, camera, pixel size binning, filter, etc) that can
          be used by processing software.
        </dd>
        <dt>Format - TIFF</dt>
        <dd>
          A lossless file format, but not especifically oriented towards
          astronomy.
        </dd>
        <dt>Count</dt>
        <dd>Number of images to take</dd>
      </dl>
    </div>
  );
}
