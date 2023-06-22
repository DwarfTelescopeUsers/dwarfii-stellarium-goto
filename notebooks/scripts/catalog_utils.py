import pandas as pd

catalog_columns = ['Catalogue Entry', 'Alternative Entries', 'Familiar Name',
       'Right Ascension', 'Declination', 'Major Axis', 'Minor Axis',
       'Magnitude', 'Name catalog', 'Name number',
       'Type', 'Type Category', 'Constellation', "Width (')", "Height (')", 'Notes']

def format_ngc_catalog(original_df):
    df = original_df.copy()

    # get catalog and number
    df[['Name catalog','Name number (with zeros)' ]] = df['Name'].str.strip().str.extract('^([A-Za-z]+)([0-9 A-Z]+)', expand=True)
    df['Name normalized'] = df['Name number (with zeros)'].str.extract('^0*([0-9 A-Z]+)')

    # handle IC and Messier objects
    df.loc[df['Name catalog'] == 'IC',  'IC name'] = 'IC ' + df['Name normalized']
    df.loc[df['Name catalog'] == 'M',  'M name'] = 'M ' + df['Name normalized']

    df['Name normalized'] = df['Name catalog'] + ' ' + df['Name normalized']

    df['Name number'] = df['Name number (with zeros)'].str.extract('([0-9]+)')
    df['Name number'] = df['Name number'].astype(int)

    # If object is a Messier object, use Messier data as the name
    df.loc[df['M'].notna(), 'Name normalized'] = 'M ' + df['M'].astype(str)
    df.loc[df['M'].notna(),  'Name catalog'] = 'M'
    df.loc[df['M'].notna(),  'Name number'] = df['M']

    return df


def merge_type_constellation(df, types_path, constellation_path):
    type_df = pd.read_csv(types_path)
    type_df.rename(columns={'name': 'Type Name', 'category': 'Type Category'}, inplace=True)

    constellation_pd = pd.read_csv(constellation_path, usecols=['Abbreviations IAU', 'name'])
    constellation_pd.rename(columns={'name': 'Constellation'}, inplace=True)

    merge_df = df.merge(type_df, left_on='Type', right_on='code', how='left')
    del merge_df['Type']

    merge_df = merge_df.merge(constellation_pd, left_on='Const', right_on='Abbreviations IAU', how='left')

    merge_df.rename(columns={
        'Name': 'Catalogue Entry',
        'Alternate Names': 'Alternative Entries',
        'Common Names': 'Familiar Name',
        'RA': 'Right Ascension',
        'Dec': 'Declination',
        'MajAx': 'Major Axis',
        'MinAx': 'Minor Axis',
        'V-Mag': 'Magnitude',
        'Type Name': 'Type'
    }, inplace=True)

    if "Width (')" not in merge_df.columns:
        merge_df["Width (')"] = pd.NA
        merge_df["Height (')"] = pd.NA

    return merge_df[catalog_columns]


def formatDD(number):
    return f'{"{:02.0f}".format(number)}'

def formatDDdotDD(number):
    return f'{"{:05.2f}".format(number)}'

# https://stackoverflow.com/a/32087825
def decToHMS(decHour, include_sign=False):
    """convert 1.2345 to 01:04:04.20"""
    time = abs(decHour)
    seconds = time * 3600
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)

    timeStr = f'{formatDD(h)}:{formatDD(m)}:{formatDDdotDD(s)}'

    if(include_sign):
        sign = '+' if decHour >= 0 else '-'
        timeStr = sign + timeStr
    elif decHour < 0:
        timeStr = '-' + timeStr

    return timeStr
